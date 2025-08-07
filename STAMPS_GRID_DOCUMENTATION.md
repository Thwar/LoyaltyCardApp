# StampsGrid Component

A reusable React Native component for rendering loyalty card stamps throughout the app.

## Features

- **Customizable Shapes**: Supports circle, square, and egg-shaped stamps
- **Configurable Sizes**: Small, medium, and large size options
- **Animation Support**: Optional stamp-by-stamp animation effects
- **Flexible Styling**: Custom colors, container styles, and checkmark visibility
- **Responsive Grid**: Automatically adjusts column count based on stamp total

## Usage

```tsx
import { StampsGrid } from '../components/StampsGrid';

// Basic usage
<StampsGrid
  totalSlots={10}
  currentStamps={7}
  stampShape="circle"
  showAnimation={true}
/>

// Advanced usage with custom styling
<StampsGrid
  totalSlots={12}
  currentStamps={5}
  stampShape="square"
  size="large"
  showAnimation={false}
  stampColor="#E53935"
  showCheckmarks={false}
  containerStyle={{ marginVertical: 20 }}
/>
```

## Props

| Prop             | Type                             | Default          | Description                      |
| ---------------- | -------------------------------- | ---------------- | -------------------------------- |
| `totalSlots`     | `number`                         | **Required**     | Total number of stamp slots      |
| `currentStamps`  | `number`                         | `0`              | Number of filled stamps          |
| `stampShape`     | `"circle" \| "square" \| "egg"`  | `"circle"`       | Shape of the stamps              |
| `showAnimation`  | `boolean`                        | `true`           | Enable stamp-by-stamp animation  |
| `size`           | `"small" \| "medium" \| "large"` | `"medium"`       | Size of the stamps               |
| `containerStyle` | `ViewStyle`                      | `undefined`      | Custom styles for the container  |
| `stampColor`     | `string`                         | `COLORS.primary` | Color for filled stamps          |
| `showCheckmarks` | `boolean`                        | `true`           | Show checkmarks in filled stamps |

## Size Reference

- **Small**: 24px stamps - Good for list items and compact displays
- **Medium**: 36px stamps - Default size for loyalty cards
- **Large**: 48px stamps - Good for detailed views and previews

## Use Cases

1. **Loyalty Cards**: Main display in `AnimatedLoyaltyCard`
2. **Customer Profiles**: Show progress across multiple businesses
3. **Business Dashboard**: Preview loyalty card designs
4. **List Items**: Mini stamps indicator in customer/business lists
5. **Progress Displays**: Any interface showing completion progress

## Grid Layout

The component automatically determines the optimal column count:

- 1-6 stamps: 3 columns
- 7-12 stamps: 4 columns
- 13-16 stamps: 4 columns
- 17+ stamps: 5 columns

## Animation

When `showAnimation={true}`:

- Stamps appear one by one with scale animation
- Each stamp has a 150ms delay from the previous
- Animation duration is 300ms per stamp
- Empty stamps are always visible (no animation)

## Integration with AnimatedLoyaltyCard

The `StampsGrid` component has been integrated into `AnimatedLoyaltyCard`, replacing the previous inline `renderStamps` function. This allows for:

- Consistent stamp rendering across the app
- Easier maintenance and updates
- Reusable stamp logic for other components
- Better separation of concerns
