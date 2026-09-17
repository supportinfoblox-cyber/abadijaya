import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.File;

public class GenerateIcons {
    public static void main(String[] args) throws Exception {
        File srcIconFile = new File("public/logo-icon.png");
        File srcFullLogoFile = new File("public/logo.png");

        if (!srcIconFile.exists()) {
            System.err.println("Source file not found: " + srcIconFile.getAbsolutePath());
            System.exit(1);
        }

        BufferedImage srcIcon = ImageIO.read(srcIconFile);
        BufferedImage srcLogo = srcFullLogoFile.exists() ? ImageIO.read(srcFullLogoFile) : srcIcon;

        System.out.println("Loaded source icon: " + srcIcon.getWidth() + "x" + srcIcon.getHeight());
        System.out.println("Loaded source full logo: " + srcLogo.getWidth() + "x" + srcLogo.getHeight());

        String resDir = "android/app/src/main/res";
        Color bgColor = new Color(13, 17, 23); // #0d1117

        // 1. Generate Launcher Icons for all densities
        int[][] sizes = {
            {48, 108},   // mdpi
            {72, 162},   // hdpi
            {96, 216},   // xhdpi
            {144, 324},  // xxhdpi
            {192, 432}   // xxxhdpi
        };
        String[] densityNames = {"mipmap-mdpi", "mipmap-hdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi"};

        for (int i = 0; i < densityNames.length; i++) {
            String dirPath = resDir + "/" + densityNames[i];
            new File(dirPath).mkdirs();
            int iconSize = sizes[i][0];
            int fgSize = sizes[i][1];

            // A. ic_launcher.png (Squircle background with logo)
            BufferedImage icon = createLauncherIcon(srcIcon, iconSize, bgColor, false);
            ImageIO.write(icon, "png", new File(dirPath + "/ic_launcher.png"));

            // B. ic_launcher_round.png (Circular background with logo)
            BufferedImage iconRound = createLauncherIcon(srcIcon, iconSize, bgColor, true);
            ImageIO.write(iconRound, "png", new File(dirPath + "/ic_launcher_round.png"));

            // C. ic_launcher_foreground.png (Adaptive Icon foreground)
            BufferedImage iconFg = createForegroundIcon(srcIcon, fgSize);
            ImageIO.write(iconFg, "png", new File(dirPath + "/ic_launcher_foreground.png"));

            System.out.println("Generated launcher icons for " + densityNames[i]);
        }

        // 2. Generate Splash Screens
        int[][] splashPortSizes = {
            {320, 480},   // mdpi
            {480, 800},   // hdpi
            {720, 1280},  // xhdpi
            {960, 1600},  // xxhdpi
            {1280, 1920}  // xxxhdpi
        };
        String[] portDirs = {
            "drawable-port-mdpi", "drawable-port-hdpi", "drawable-port-xhdpi", "drawable-port-xxhdpi", "drawable-port-xxxhdpi"
        };
        for (int i = 0; i < portDirs.length; i++) {
            String dir = resDir + "/" + portDirs[i];
            new File(dir).mkdirs();
            BufferedImage sp = createSplashScreen(srcLogo, splashPortSizes[i][0], splashPortSizes[i][1], bgColor);
            ImageIO.write(sp, "png", new File(dir + "/splash.png"));
        }

        // Base drawable splash
        new File(resDir + "/drawable").mkdirs();
        BufferedImage baseSplash = createSplashScreen(srcLogo, 480, 800, bgColor);
        ImageIO.write(baseSplash, "png", new File(resDir + "/drawable/splash.png"));

        System.out.println("All Android launcher icons and splash screens generated successfully!");
    }

    private static BufferedImage createLauncherIcon(BufferedImage src, int size, Color bg, boolean circular) {
        BufferedImage out = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        // Background shape
        g.setColor(bg);
        if (circular) {
            g.fill(new Ellipse2D.Float(0, 0, size, size));
        } else {
            int cornerRadius = Math.max(4, size / 5);
            g.fill(new RoundRectangle2D.Float(0, 0, size, size, cornerRadius, cornerRadius));
        }

        // Subtle gradient highlight
        GradientPaint gp = new GradientPaint(0, 0, new Color(255, 255, 255, 25), 0, size, new Color(0, 0, 0, 40));
        g.setPaint(gp);
        if (circular) {
            g.fill(new Ellipse2D.Float(0, 0, size, size));
        } else {
            int cornerRadius = Math.max(4, size / 5);
            g.fill(new RoundRectangle2D.Float(0, 0, size, size, cornerRadius, cornerRadius));
        }

        // Inner emblem scaled with pleasant margin (82% of size)
        int emblemSize = (int)(size * 0.82);
        int offset = (size - emblemSize) / 2;
        g.drawImage(src, offset, offset, emblemSize, emblemSize, null);

        g.dispose();
        return out;
    }

    private static BufferedImage createForegroundIcon(BufferedImage src, int size) {
        BufferedImage out = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        // Adaptive Icon safe zone is inner 66%
        int emblemSize = (int)(size * 0.65);
        int offset = (size - emblemSize) / 2;
        g.drawImage(src, offset, offset, emblemSize, emblemSize, null);

        g.dispose();
        return out;
    }

    private static BufferedImage createSplashScreen(BufferedImage src, int width, int height, Color bg) {
        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        // Solid background
        g.setColor(bg);
        g.fillRect(0, 0, width, height);

        // Center logo
        int logoTargetWidth = (int)(width * 0.70);
        int logoTargetHeight = (int)((double)src.getHeight() / src.getWidth() * logoTargetWidth);
        if (logoTargetHeight > height * 0.45) {
            logoTargetHeight = (int)(height * 0.45);
            logoTargetWidth = (int)((double)src.getWidth() / src.getHeight() * logoTargetHeight);
        }

        int x = (width - logoTargetWidth) / 2;
        int y = (height - logoTargetHeight) / 2;
        g.drawImage(src, x, y, logoTargetWidth, logoTargetHeight, null);

        g.dispose();
        return out;
    }
}
