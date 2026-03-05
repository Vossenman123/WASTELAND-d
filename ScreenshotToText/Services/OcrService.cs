using System.Diagnostics;
using Tesseract;

namespace ScreenshotToText.Services;

/// <summary>
/// Service for extracting text from images using Tesseract OCR.
/// Supports both the .NET Tesseract wrapper and fallback to the CLI.
/// </summary>
public sealed class OcrService : IDisposable
{
    private readonly string _tessDataPath;
    private readonly string _language;
    private TesseractEngine? _engine;
    private bool _disposed;
    private bool _useCliMode;

    /// <summary>
    /// Initializes the OCR engine with the specified data path and language.
    /// </summary>
    /// <param name="tessDataPath">Path to the Tesseract data files directory.</param>
    /// <param name="language">Language code (e.g. "eng", "nld", "eng+nld").</param>
    public OcrService(string tessDataPath, string language = "eng")
    {
        _tessDataPath = tessDataPath;
        _language = language;

        if (!Directory.Exists(tessDataPath))
        {
            throw new DirectoryNotFoundException(
                $"Tesseract data directory not found: {tessDataPath}. " +
                "Download traineddata files from https://github.com/tesseract-ocr/tessdata");
        }

        // Try to initialize the .NET wrapper; fall back to CLI if it fails
        try
        {
            _engine = new TesseractEngine(tessDataPath, language, EngineMode.Default);
        }
        catch
        {
            _useCliMode = true;
        }
    }

    /// <summary>
    /// Extracts text from an image file.
    /// </summary>
    /// <param name="imagePath">Path to the image file.</param>
    /// <returns>An OcrResult containing the extracted text and confidence.</returns>
    public OcrResult ExtractText(string imagePath)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        if (!File.Exists(imagePath))
        {
            throw new FileNotFoundException("Image file not found.", imagePath);
        }

        if (_useCliMode || _engine == null)
        {
            return ExtractTextViaCli(imagePath);
        }

        return ExtractTextViaLibrary(imagePath);
    }

    /// <summary>
    /// Extracts text from image bytes.
    /// </summary>
    /// <param name="imageBytes">The image data as a byte array.</param>
    /// <returns>An OcrResult containing the extracted text and confidence.</returns>
    public OcrResult ExtractText(byte[] imageBytes)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        if (_useCliMode || _engine == null)
        {
            // Save to temp file and use CLI
            var tempPath = Path.Combine(Path.GetTempPath(), $"ocr_input_{Guid.NewGuid()}.png");
            try
            {
                File.WriteAllBytes(tempPath, imageBytes);
                return ExtractTextViaCli(tempPath);
            }
            finally
            {
                if (File.Exists(tempPath)) File.Delete(tempPath);
            }
        }

        using var img = Pix.LoadFromMemory(imageBytes);
        using var page = _engine.Process(img);

        return new OcrResult
        {
            Text = page.GetText().Trim(),
            Confidence = page.GetMeanConfidence()
        };
    }

    private OcrResult ExtractTextViaLibrary(string imagePath)
    {
        using var img = Pix.LoadFromFile(imagePath);
        using var page = _engine!.Process(img);

        return new OcrResult
        {
            Text = page.GetText().Trim(),
            Confidence = page.GetMeanConfidence()
        };
    }

    private OcrResult ExtractTextViaCli(string imagePath)
    {
        var outputBase = Path.Combine(Path.GetTempPath(), $"ocr_output_{Guid.NewGuid()}");
        var outputFile = outputBase + ".txt";

        try
        {
            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = "tesseract",
                Arguments = $"\"{imagePath}\" \"{outputBase}\" -l {_language} --tessdata-dir \"{_tessDataPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            process.Start();
            var stderr = process.StandardError.ReadToEnd();
            if (!process.WaitForExit(30000))
            {
                process.Kill();
                throw new InvalidOperationException("Tesseract CLI timed out after 30 seconds.");
            }

            if (process.ExitCode != 0)
            {
                throw new InvalidOperationException($"Tesseract CLI failed: {stderr}");
            }

            var text = File.Exists(outputFile) ? File.ReadAllText(outputFile).Trim() : string.Empty;

            return new OcrResult
            {
                Text = text,
                Confidence = -1f // CLI doesn't return confidence by default
            };
        }
        finally
        {
            if (File.Exists(outputFile)) File.Delete(outputFile);
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _engine?.Dispose();
            _disposed = true;
        }
    }
}

/// <summary>
/// Represents the result of an OCR operation.
/// </summary>
public class OcrResult
{
    /// <summary>
    /// The extracted text content.
    /// </summary>
    public string Text { get; init; } = string.Empty;

    /// <summary>
    /// The mean confidence of the OCR result (0.0 to 1.0, or -1 if not available).
    /// </summary>
    public float Confidence { get; init; }
}
