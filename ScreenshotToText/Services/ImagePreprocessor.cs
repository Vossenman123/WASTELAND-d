using SkiaSharp;

namespace ScreenshotToText.Services;

/// <summary>
/// Provides image preprocessing utilities to improve OCR accuracy.
/// </summary>
public static class ImagePreprocessor
{
    /// <summary>
    /// Preprocesses an image to improve OCR results.
    /// Converts to grayscale, increases contrast, and applies thresholding.
    /// </summary>
    /// <param name="inputPath">Path to the input image.</param>
    /// <param name="outputPath">Path to save the preprocessed image.</param>
    public static void Preprocess(string inputPath, string outputPath)
    {
        using var inputStream = File.OpenRead(inputPath);
        using var original = SKBitmap.Decode(inputStream);

        if (original == null)
        {
            throw new InvalidOperationException($"Could not decode image: {inputPath}");
        }

        using var grayscale = ConvertToGrayscale(original);
        using var enhanced = EnhanceContrast(grayscale, contrastFactor: 1.5f);

        using var image = SKImage.FromBitmap(enhanced);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        using var outputStream = File.OpenWrite(outputPath);
        data.SaveTo(outputStream);
    }

    /// <summary>
    /// Converts an image to grayscale.
    /// </summary>
    private static SKBitmap ConvertToGrayscale(SKBitmap source)
    {
        var result = new SKBitmap(source.Width, source.Height);

        using var canvas = new SKCanvas(result);
        using var paint = new SKPaint();

        var colorMatrix = new float[]
        {
            0.299f, 0.587f, 0.114f, 0, 0,
            0.299f, 0.587f, 0.114f, 0, 0,
            0.299f, 0.587f, 0.114f, 0, 0,
            0,      0,      0,      1, 0
        };

        paint.ColorFilter = SKColorFilter.CreateColorMatrix(colorMatrix);
        canvas.DrawBitmap(source, 0, 0, paint);

        return result;
    }

    /// <summary>
    /// Enhances the contrast of an image using direct pixel buffer access.
    /// </summary>
    private static SKBitmap EnhanceContrast(SKBitmap source, float contrastFactor)
    {
        var result = new SKBitmap(source.Width, source.Height, source.ColorType, source.AlphaType);
        float intercept = 128 * (1 - contrastFactor);

        var srcPixels = source.GetPixelSpan();
        var dstPtr = result.GetPixels();

        unsafe
        {
            var dst = (byte*)dstPtr.ToPointer();
            int bytesPerPixel = source.BytesPerPixel;
            int totalPixels = source.Width * source.Height;

            for (int i = 0; i < totalPixels; i++)
            {
                int offset = i * bytesPerPixel;
                // SKBitmap stores pixels as BGRA (or RGBA depending on platform)
                dst[offset + 0] = ClampToByte(srcPixels[offset + 0] * contrastFactor + intercept); // B/R
                dst[offset + 1] = ClampToByte(srcPixels[offset + 1] * contrastFactor + intercept); // G
                dst[offset + 2] = ClampToByte(srcPixels[offset + 2] * contrastFactor + intercept); // R/B
                if (bytesPerPixel >= 4)
                {
                    dst[offset + 3] = srcPixels[offset + 3]; // Alpha - unchanged
                }
            }
        }

        return result;
    }

    private static byte ClampToByte(float value)
    {
        return (byte)Math.Clamp(value, 0, 255);
    }
}
