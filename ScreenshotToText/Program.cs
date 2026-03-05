using ScreenshotToText.Services;

namespace ScreenshotToText;

/// <summary>
/// Screenshot to Text - A C# application that captures screenshots
/// and extracts text using Tesseract OCR.
/// </summary>
public class Program
{
    private const string AppName = "Screenshot to Text";
    private const string Version = "1.0.0";

    public static int Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        if (args.Length == 0)
        {
            return RunInteractiveMode();
        }

        return RunCommandLineMode(args);
    }

    /// <summary>
    /// Interactive menu-driven mode.
    /// </summary>
    private static int RunInteractiveMode()
    {
        PrintHeader();

        while (true)
        {
            Console.WriteLine();
            Console.WriteLine("╔══════════════════════════════════════╗");
            Console.WriteLine("║           MAIN MENU                  ║");
            Console.WriteLine("╠══════════════════════════════════════╣");
            Console.WriteLine("║  1. Take screenshot & extract text   ║");
            Console.WriteLine("║  2. Extract text from image file     ║");
            Console.WriteLine("║  3. Extract text (with preprocessing)║");
            Console.WriteLine("║  4. Settings / Help                  ║");
            Console.WriteLine("║  5. Exit                             ║");
            Console.WriteLine("╚══════════════════════════════════════╝");
            Console.Write("\n> Choose an option (1-5): ");

            var input = Console.ReadLine()?.Trim();

            switch (input)
            {
                case "1":
                    HandleScreenshotAndExtract();
                    break;
                case "2":
                    HandleExtractFromFile(preprocess: false);
                    break;
                case "3":
                    HandleExtractFromFile(preprocess: true);
                    break;
                case "4":
                    PrintHelp();
                    break;
                case "5":
                    Console.WriteLine("\nGoodbye!");
                    return 0;
                default:
                    Console.WriteLine("Invalid option. Please choose 1-5.");
                    break;
            }
        }
    }

    /// <summary>
    /// Command-line argument mode for scripting.
    /// </summary>
    private static int RunCommandLineMode(string[] args)
    {
        string? imagePath = null;
        string tessDataPath = FindTessDataPath();
        string language = "eng";
        bool preprocess = false;
        bool screenshot = false;
        string? outputFile = null;

        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i].ToLowerInvariant())
            {
                case "--help" or "-h":
                    PrintUsage();
                    return 0;
                case "--version" or "-v":
                    Console.WriteLine($"{AppName} v{Version}");
                    return 0;
                case "--image" or "-i":
                    if (i + 1 < args.Length) imagePath = args[++i];
                    break;
                case "--tessdata" or "-t":
                    if (i + 1 < args.Length) tessDataPath = args[++i];
                    break;
                case "--language" or "-l":
                    if (i + 1 < args.Length) language = args[++i];
                    break;
                case "--preprocess" or "-p":
                    preprocess = true;
                    break;
                case "--screenshot" or "-s":
                    screenshot = true;
                    break;
                case "--output" or "-o":
                    if (i + 1 < args.Length) outputFile = args[++i];
                    break;
                default:
                    // If it looks like a file path, treat it as the image
                    if (File.Exists(args[i]))
                        imagePath = args[i];
                    break;
            }
        }

        if (screenshot)
        {
            var tempPath = Path.Combine(Path.GetTempPath(), $"screenshot_{DateTime.Now:yyyyMMdd_HHmmss}.png");
            Console.WriteLine($"Capturing screenshot to: {tempPath}");
            if (!ScreenshotService.CaptureScreenshot(tempPath))
            {
                Console.Error.WriteLine("Failed to capture screenshot.");
                return 1;
            }
            imagePath = tempPath;
        }

        if (string.IsNullOrEmpty(imagePath))
        {
            Console.Error.WriteLine("Error: No image provided. Use --image <path> or --screenshot.");
            PrintUsage();
            return 1;
        }

        return ExtractAndOutput(imagePath, tessDataPath, language, preprocess, outputFile);
    }

    private static void HandleScreenshotAndExtract()
    {
        var tempPath = Path.Combine(Path.GetTempPath(), $"screenshot_{DateTime.Now:yyyyMMdd_HHmmss}.png");
        Console.WriteLine($"\nCapturing screenshot...");

        if (!ScreenshotService.CaptureScreenshot(tempPath))
        {
            Console.WriteLine("❌ Failed to capture screenshot.");
            Console.WriteLine("   Make sure a screenshot tool is available (scrot, gnome-screenshot, etc.).");
            return;
        }

        Console.WriteLine($"✅ Screenshot saved to: {tempPath}");
        RunOcrOnFile(tempPath, preprocess: false);
    }

    private static void HandleExtractFromFile(bool preprocess)
    {
        Console.Write("\nEnter image path: ");
        var path = Console.ReadLine()?.Trim().Trim('"');

        if (string.IsNullOrEmpty(path) || !File.Exists(path))
        {
            Console.WriteLine("❌ File not found.");
            return;
        }

        RunOcrOnFile(path, preprocess);
    }

    private static void RunOcrOnFile(string imagePath, bool preprocess)
    {
        var tessDataPath = FindTessDataPath();

        Console.Write("Language (default: eng): ");
        var lang = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(lang)) lang = "eng";

        var processPath = imagePath;

        if (preprocess)
        {
            Console.WriteLine("Preprocessing image...");
            processPath = Path.Combine(Path.GetTempPath(), $"preprocessed_{Path.GetFileName(imagePath)}");
            try
            {
                ImagePreprocessor.Preprocess(imagePath, processPath);
                Console.WriteLine("✅ Image preprocessed (grayscale + contrast enhancement).");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️  Preprocessing failed: {ex.Message}");
                Console.WriteLine("   Continuing with original image...");
                processPath = imagePath;
            }
        }

        ExtractAndOutput(processPath, tessDataPath, lang, false, null);
    }

    private static int ExtractAndOutput(string imagePath, string tessDataPath, string language, bool preprocess, string? outputFile)
    {
        var processPath = imagePath;

        if (preprocess)
        {
            processPath = Path.Combine(Path.GetTempPath(), $"preprocessed_{Path.GetFileName(imagePath)}");
            try
            {
                Console.WriteLine("Preprocessing image...");
                ImagePreprocessor.Preprocess(imagePath, processPath);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Warning: Preprocessing failed ({ex.Message}), using original.");
                processPath = imagePath;
            }
        }

        try
        {
            Console.WriteLine($"Extracting text (language: {language})...");
            Console.WriteLine($"Using tessdata path: {tessDataPath}");

            using var ocr = new OcrService(tessDataPath, language);
            var result = ocr.ExtractText(processPath);

            Console.WriteLine();
            Console.WriteLine("╔══════════════════════════════════════════════╗");
            Console.WriteLine("║              EXTRACTED TEXT                   ║");
            Console.WriteLine("╠══════════════════════════════════════════════╣");
            Console.WriteLine();

            if (string.IsNullOrWhiteSpace(result.Text))
            {
                Console.WriteLine("  (No text detected in the image)");
            }
            else
            {
                Console.WriteLine(result.Text);
            }

            Console.WriteLine();
            Console.WriteLine("╚══════════════════════════════════════════════╝");
            if (result.Confidence >= 0)
            {
                Console.WriteLine($"  Confidence: {result.Confidence:P1}");
            }

            if (!string.IsNullOrEmpty(outputFile))
            {
                File.WriteAllText(outputFile, result.Text);
                Console.WriteLine($"  Text saved to: {outputFile}");
            }

            return 0;
        }
        catch (DirectoryNotFoundException ex)
        {
            Console.Error.WriteLine($"❌ {ex.Message}");
            Console.Error.WriteLine();
            Console.Error.WriteLine("To install Tesseract data files:");
            Console.Error.WriteLine("  Ubuntu/Debian: sudo apt install tesseract-ocr tesseract-ocr-eng");
            Console.Error.WriteLine("  macOS:         brew install tesseract");
            Console.Error.WriteLine("  Windows:       Download from https://github.com/tesseract-ocr/tessdata");
            Console.Error.WriteLine();
            Console.Error.WriteLine("Or set the TESSDATA_PREFIX environment variable to the tessdata directory.");
            return 1;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"❌ OCR Error: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.Error.WriteLine($"   Inner: {ex.InnerException.Message}");
            }
            return 1;
        }
    }

    /// <summary>
    /// Finds the tessdata directory by checking common locations.
    /// </summary>
    internal static string FindTessDataPath()
    {
        // Check environment variable first
        var envPath = Environment.GetEnvironmentVariable("TESSDATA_PREFIX");
        if (!string.IsNullOrEmpty(envPath) && Directory.Exists(envPath))
            return envPath;

        // Common tessdata locations
        var candidates = new[]
        {
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tessdata"),
            Path.Combine(Directory.GetCurrentDirectory(), "tessdata"),
            "/usr/share/tesseract-ocr/5/tessdata",
            "/usr/share/tesseract-ocr/4.00/tessdata",
            "/usr/share/tessdata",
            "/usr/local/share/tessdata",
            "/opt/homebrew/share/tessdata",
            @"C:\Program Files\Tesseract-OCR\tessdata",
            @"C:\Program Files (x86)\Tesseract-OCR\tessdata",
        };

        foreach (var path in candidates)
        {
            if (Directory.Exists(path))
                return path;
        }

        // Default fallback
        return Path.Combine(Directory.GetCurrentDirectory(), "tessdata");
    }

    private static void PrintHeader()
    {
        Console.WriteLine();
        Console.WriteLine("╔══════════════════════════════════════════════╗");
        Console.WriteLine("║        📷  SCREENSHOT TO TEXT  📝            ║");
        Console.WriteLine("║        Powered by Tesseract OCR              ║");
        Console.WriteLine($"║        Version {Version,-31}║");
        Console.WriteLine("╚══════════════════════════════════════════════╝");
    }

    private static void PrintHelp()
    {
        Console.WriteLine();
        Console.WriteLine("╔══════════════════════════════════════════════╗");
        Console.WriteLine("║              HELP & SETTINGS                  ║");
        Console.WriteLine("╠══════════════════════════════════════════════╣");
        Console.WriteLine("║                                              ║");
        Console.WriteLine("║  This application extracts text from         ║");
        Console.WriteLine("║  screenshots or image files using OCR.       ║");
        Console.WriteLine("║                                              ║");
        Console.WriteLine("║  REQUIREMENTS:                               ║");
        Console.WriteLine("║  • Tesseract OCR data files (tessdata)       ║");
        Console.WriteLine("║  • Screenshot tool (for capture mode)        ║");
        Console.WriteLine("║                                              ║");
        Console.WriteLine("║  INSTALL TESSERACT:                          ║");
        Console.WriteLine("║  Ubuntu: sudo apt install tesseract-ocr      ║");
        Console.WriteLine("║  macOS:  brew install tesseract              ║");
        Console.WriteLine("║  Windows: choco install tesseract            ║");
        Console.WriteLine("║                                              ║");
        Console.WriteLine("║  SUPPORTED LANGUAGES:                        ║");
        Console.WriteLine("║  eng (English), nld (Dutch), deu (German),   ║");
        Console.WriteLine("║  fra (French), spa (Spanish), etc.           ║");
        Console.WriteLine("║  Install: sudo apt install tesseract-ocr-nld ║");
        Console.WriteLine("║                                              ║");
        Console.WriteLine("║  ENVIRONMENT VARIABLES:                      ║");
        Console.WriteLine("║  TESSDATA_PREFIX = path to tessdata folder   ║");
        Console.WriteLine("║                                              ║");
        Console.WriteLine("║  PREPROCESSING:                              ║");
        Console.WriteLine("║  Option 3 converts the image to grayscale    ║");
        Console.WriteLine("║  and enhances contrast for better OCR.       ║");
        Console.WriteLine("║                                              ║");
        Console.WriteLine("╚══════════════════════════════════════════════╝");
        Console.WriteLine();
        Console.WriteLine($"  Tessdata path: {FindTessDataPath()}");
    }

    private static void PrintUsage()
    {
        Console.WriteLine($"{AppName} v{Version}");
        Console.WriteLine();
        Console.WriteLine("Usage:");
        Console.WriteLine("  ScreenshotToText [options]");
        Console.WriteLine();
        Console.WriteLine("Options:");
        Console.WriteLine("  -i, --image <path>       Path to image file");
        Console.WriteLine("  -s, --screenshot         Capture a screenshot first");
        Console.WriteLine("  -p, --preprocess         Preprocess image for better OCR");
        Console.WriteLine("  -l, --language <lang>    OCR language (default: eng)");
        Console.WriteLine("  -t, --tessdata <path>    Path to tessdata directory");
        Console.WriteLine("  -o, --output <path>      Save extracted text to file");
        Console.WriteLine("  -h, --help               Show this help");
        Console.WriteLine("  -v, --version            Show version");
        Console.WriteLine();
        Console.WriteLine("Examples:");
        Console.WriteLine("  ScreenshotToText --image photo.png");
        Console.WriteLine("  ScreenshotToText --screenshot --output text.txt");
        Console.WriteLine("  ScreenshotToText -i scan.jpg -p -l nld");
        Console.WriteLine("  ScreenshotToText  (interactive mode)");
    }
}
