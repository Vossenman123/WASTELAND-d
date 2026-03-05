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
    /// Enhances the contrast of an image.
    /// </summary>
    private static SKBitmap EnhanceContrast(SKBitmap source, float contrastFactor)
    {
        var result = new SKBitmap(source.Width, source.Height);
        float intercept = 128 * (1 - contrastFactor);

        for (int y = 0; y < source.Height; y++)
        {
            for (int x = 0; x < source.Width; x++)
            {
                var pixel = source.GetPixel(x, y);
                byte r = ClampToByte(pixel.Red * contrastFactor + intercept);
                byte g = ClampToByte(pixel.Green * contrastFactor + intercept);
                byte b = ClampToByte(pixel.Blue * contrastFactor + intercept);
                result.SetPixel(x, y, new SKColor(r, g, b, pixel.Alpha));
            }
        }

        return result;
    }

    private static byte ClampToByte(float value)
    {
        return (byte)Math.Clamp(value, 0, 255);
    }
}
