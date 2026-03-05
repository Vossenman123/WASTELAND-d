using System.Diagnostics;
using System.Runtime.InteropServices;

namespace ScreenshotToText.Services;

/// <summary>
/// Service for capturing screenshots on different platforms.
/// </summary>
public static class ScreenshotService
{
    /// <summary>
    /// Captures a full screenshot and saves it to the specified file path.
    /// </summary>
    /// <param name="outputPath">The file path to save the screenshot (PNG format).</param>
    /// <returns>True if the screenshot was captured successfully, false otherwise.</returns>
    public static bool CaptureScreenshot(string outputPath)
    {
        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                return CaptureWindows(outputPath);
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                return CaptureLinux(outputPath);
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            {
                return CaptureMacOS(outputPath);
            }
            else
            {
                Console.WriteLine("Error: Unsupported operating system.");
                return false;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error capturing screenshot: {ex.Message}");
            return false;
        }
    }

    private static bool CaptureWindows(string outputPath)
    {
        // Use PowerShell to take a screenshot on Windows
        var script = $@"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bitmap.Save('{outputPath.Replace("'", "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
";
        return RunProcess("powershell", $"-NoProfile -Command \"{script}\"");
    }

    private static bool CaptureLinux(string outputPath)
    {
        // Try multiple screenshot tools in order of preference
        if (RunProcess("gnome-screenshot", $"-f \"{outputPath}\""))
            return true;
        if (RunProcess("scrot", $"\"{outputPath}\""))
            return true;
        if (RunProcess("import", $"-window root \"{outputPath}\""))
            return true;
        if (RunProcess("xfce4-screenshooter", $"-f -s \"{outputPath}\""))
            return true;

        Console.WriteLine("Error: No screenshot tool found. Install gnome-screenshot, scrot, or imagemagick.");
        return false;
    }

    private static bool CaptureMacOS(string outputPath)
    {
        return RunProcess("screencapture", $"-x \"{outputPath}\"");
    }

    private static bool RunProcess(string fileName, string arguments)
    {
        try
        {
            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            process.Start();
            process.WaitForExit(10000); // 10 second timeout
            return process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }
}
