# 📷 Screenshot to Text

A complete C# console application that captures screenshots and extracts text using **Tesseract OCR**.

## Features

- **Screenshot capture** – cross-platform support (Windows, Linux, macOS)
- **Image-to-text OCR** – powered by Tesseract OCR engine
- **Image preprocessing** – grayscale conversion & contrast enhancement for better results
- **Interactive mode** – menu-driven console interface
- **Command-line mode** – scriptable with CLI arguments
- **Multi-language** – supports all Tesseract language packs (English, Dutch, German, etc.)
- **Text export** – save extracted text to a file

## Prerequisites

### .NET 8.0 SDK
Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0)

### Tesseract OCR Data Files
The application needs Tesseract trained data files:

**Ubuntu/Debian:**
```bash
sudo apt install tesseract-ocr tesseract-ocr-eng
# For Dutch: sudo apt install tesseract-ocr-nld
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
```bash
choco install tesseract
# Or download from https://github.com/tesseract-ocr/tessdata
```

### Screenshot Tools (for capture mode)
**Linux:** Install one of: `gnome-screenshot`, `scrot`, or `imagemagick`
```bash
sudo apt install scrot
```

## Build & Run

```bash
cd ScreenshotToText
dotnet build
dotnet run
```

## Usage

### Interactive Mode
```bash
dotnet run
```
This opens a menu where you can:
1. Take a screenshot and extract text
2. Load an image file and extract text
3. Load an image with preprocessing (better OCR accuracy)

### Command-Line Mode
```bash
# Extract text from an image
dotnet run -- --image photo.png

# Capture screenshot and extract text
dotnet run -- --screenshot

# With preprocessing and save to file
dotnet run -- --image scan.jpg --preprocess --output result.txt

# Use Dutch language
dotnet run -- --image document.png --language nld

# Specify tessdata path
dotnet run -- --image photo.png --tessdata /path/to/tessdata
```

### CLI Options
| Option | Short | Description |
|--------|-------|-------------|
| `--image <path>` | `-i` | Path to image file |
| `--screenshot` | `-s` | Capture a screenshot first |
| `--preprocess` | `-p` | Preprocess image for better OCR |
| `--language <lang>` | `-l` | OCR language (default: `eng`) |
| `--tessdata <path>` | `-t` | Path to tessdata directory |
| `--output <path>` | `-o` | Save extracted text to file |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TESSDATA_PREFIX` | Path to the tessdata directory |

## Project Structure

```
ScreenshotToText/
├── Program.cs                          # Main application entry point & CLI
├── ScreenshotToText.csproj             # Project file with dependencies
├── Services/
│   ├── ScreenshotService.cs            # Cross-platform screenshot capture
│   ├── OcrService.cs                   # Tesseract OCR text extraction
│   └── ImagePreprocessor.cs            # Image preprocessing (grayscale, contrast)
└── README.md
```

## Dependencies

- [Tesseract](https://www.nuget.org/packages/Tesseract/) (5.2.0) – .NET wrapper for Tesseract OCR
- [SkiaSharp](https://www.nuget.org/packages/SkiaSharp/) (3.116.1) – Cross-platform image processing
