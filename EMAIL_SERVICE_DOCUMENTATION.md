# Email Service Documentation

## Overview
This document describes the implementation of the welcome email system for LoyaltyCard App using Resend service. The system automatically sends professional welcome emails in Spanish to new users based on their account type (Business or Customer).

## Features
- **Automatic welcome emails** upon user registration
- **Spanish language** professional templates
- **User type-specific content** (Business vs Customer)
- **Professional HTML email design** with responsive layout
- **Error handling** that doesn't block registration if email fails
- **Test utilities** for development and debugging

## Email Templates

### Business Welcome Email
- **Subject**: "¡Bienvenido a LoyaltyCard App! - Tu plataforma de fidelización empresarial"
- **Content**: Business-focused messaging about creating loyalty programs
- **Features highlighted**:
  - Creating custom loyalty cards
  - Managing customer rewards
  - Real-time tracking and analytics
  - Customer management tools
  - QR code sharing

### Customer Welcome Email
- **Subject**: "¡Bienvenido a LoyaltyCard App! - Descubre recompensas increíbles"
- **Content**: Customer-focused messaging about earning rewards
- **Features highlighted**:
  - Finding nearby businesses
  - Joining loyalty programs
  - Earning stamps automatically
  - Redeeming rewards
  - Tracking progress

## API Configuration

### Resend Setup
```typescript
const resend = new Resend('re_DN28F9BM_E7sbVGgM76wHWMhTUPicXomT');
```

### Email Configuration
- **From Email**: `noreply@loyaltyapp.com`
- **Company Name**: `LoyaltyCard App`
- **Language**: Spanish (es)

## Usage

### Automatic Integration
The email service is automatically triggered during user registration:

```typescript
// In AuthService.register()
EmailService.sendWelcomeEmail({
  email,
  displayName,
  userType
}).catch(error => {
  console.error("Failed to send welcome email:", error);
  // Email failure should not affect registration success
});
```

### Manual Usage
```typescript
import EmailService from '../services/emailService';

// Send welcome email
const success = await EmailService.sendWelcomeEmail({
  email: 'user@example.com',
  displayName: 'User Name',
  userType: 'business' // or 'customer'
});

// Send test email
const testSuccess = await EmailService.sendTestEmail('test@example.com');
```

## Testing

### Basic Email Testing
For development purposes, you can test the email service with a simple method:

```typescript
import EmailService from '../services/emailService';

// Send a test email
const success = await EmailService.sendTestEmail('test@example.com');
```

### Manual Welcome Email Testing
```typescript
import EmailService from '../services/emailService';

// Test welcome emails manually
await EmailService.sendWelcomeEmail({
  email: 'business@example.com',
  displayName: 'My Business',
  userType: 'business'
});

await EmailService.sendWelcomeEmail({
  email: 'customer@example.com', 
  displayName: 'John Doe',
  userType: 'customer'
});
```

## Email Design Features

### Responsive Design
- Mobile-friendly layout
- Professional typography
- Consistent color scheme
- Clean spacing and alignment

### Business Email Design
- **Primary Color**: Blue (#007bff)
- **Emphasizes**: Professional growth, ROI, business features
- **Icons**: Business-focused emojis (🎯, 🚀, 💡)

### Customer Email Design
- **Primary Color**: Green (#28a745)
- **Emphasizes**: Rewards, fun, savings
- **Icons**: Reward-focused emojis (🎁, ✨, 🌟)

## Error Handling

### Registration Integration
- Email failures do NOT block user registration
- Errors are logged but don't throw exceptions
- Users can still access the app even if welcome email fails

### Error Logging
```typescript
EmailService.sendWelcomeEmail(params).catch(error => {
  console.error("Failed to send welcome email:", error);
  // Registration continues normally
});
```

## Future Enhancements

### Possible Improvements
1. **Email Templates Management**: Store templates in database for easy editing
2. **Multi-language Support**: Add English and other language options
3. **Email Analytics**: Track open rates and click-through rates
4. **Segmented Emails**: Different templates based on business category
5. **Email Sequences**: Follow-up emails for onboarding
6. **Personalization**: Include user-specific data in emails

### Additional Email Types
- Password reset emails
- Loyalty program notifications
- Reward redemption confirmations
- Business analytics reports
- Customer retention campaigns

## Security Considerations

### API Key Management
- API key is currently hardcoded (development only)
- For production: Use environment variables
- Consider rotating API keys regularly

### Recommended Production Setup
```typescript
// Use environment variables
const resend = new Resend(process.env.RESEND_API_KEY);
```

### Email Validation
- Validate email format before sending
- Implement rate limiting for email sending
- Add unsubscribe mechanisms for marketing emails

## Troubleshooting

### Common Issues
1. **Email not delivered**: Check spam folder, verify email address
2. **API errors**: Verify Resend API key and account status
3. **Template issues**: Check HTML syntax and email client compatibility

### Debug Mode
Enable detailed logging for development:
```typescript
// In EmailService
console.log('Sending email to:', email);
console.log('Email type:', userType);
console.log('Resend response:', result);
```

## Support Information

### Resend Documentation
- [Resend API Docs](https://resend.com/docs)
- [Email Best Practices](https://resend.com/docs/best-practices)
- [Template Guidelines](https://resend.com/docs/templates)

### Contact Information
- **Technical Support**: Include in app settings
- **Email Issues**: Provide fallback contact method
- **Service Status**: Monitor Resend service status

---

## Implementation Checklist

- [x] ✅ Resend service integration
- [x] ✅ Spanish email templates created
- [x] ✅ Business welcome email template
- [x] ✅ Customer welcome email template
- [x] ✅ Registration integration
- [x] ✅ Error handling implementation
- [x] ✅ Test utilities created
- [x] ✅ Documentation completed
- [ ] 🔄 Environment variable setup (for production)
- [ ] 🔄 Email analytics implementation (future)
- [ ] 🔄 Template management system (future)
