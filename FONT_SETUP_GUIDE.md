# Font Installation Instructions for SoyCasero

## BalooBhaijaan2 Font Setup

To complete the font setup for your SoyCasero, you need to add the BalooBhaijaan2 font files to the `/assets/fonts/` directory.

### Required Font Files:

Place these font files in `c:\DEV\LoyaltyCardApp\assets\fonts\`:

1. **BalooBhaijaan2-Regular.ttf**
2. **BalooBhaijaan2-Medium.ttf**
3. **BalooBhaijaan2-SemiBold.ttf**
4. **BalooBhaijaan2-Bold.ttf**
5. **BalooBhaijaan2-ExtraBold.ttf**

### Download Source:

You can download the BalooBhaijaan2 font family from:

- **Google Fonts**: https://fonts.google.com/specimen/Baloo+Bhaijaan+2
- **GitHub**: https://github.com/google/fonts/tree/main/ofl/baloobhaijaan2

### What's Already Set Up:

✅ Font loading utility (`src/utils/fontLoader.ts`)
✅ Typography component (`src/components/Typography.tsx`)
✅ App.tsx updated to load fonts
✅ Constants updated with font families
✅ CreateLoyaltyCardScreen updated to use new Typography

### After Adding Font Files:

1. **Restart the development server**:

   ```bash
   npx expo start --clear
   ```

2. **Test the fonts** by checking the CreateLoyaltyCardScreen modal

### Usage Examples:

```tsx
import { Typography } from "../components";

// Headers
<Typography variant="h1">Main Title</Typography>
<Typography variant="h2">Section Title</Typography>
<Typography variant="h3">Subsection Title</Typography>

// Body text
<Typography variant="body1">Regular text</Typography>
<Typography variant="body2">Smaller text</Typography>

// With custom weight
<Typography variant="body1" weight="bold">Bold text</Typography>
<Typography variant="body1" weight="semiBold">Semi-bold text</Typography>

// With custom color
<Typography variant="h2" color="#E53935">Colored heading</Typography>
```

### Alternative: Direct Font Usage

You can also use the font directly in StyleSheet:

```tsx
import { getFontFamily } from "../constants";

const styles = StyleSheet.create({
  customText: {
    fontFamily: getFontFamily("semiBold"),
    fontSize: 18,
    color: COLORS.textPrimary,
  },
});
```

### Font Weights Available:

- **regular**: BalooBhaijaan2-Regular
- **medium**: BalooBhaijaan2-Medium
- **semiBold**: BalooBhaijaan2-SemiBold
- **bold**: BalooBhaijaan2-Bold
- **extraBold**: BalooBhaijaan2-ExtraBold

The font setup is modern, supports RTL languages, and provides excellent readability for your SoyCasero!
