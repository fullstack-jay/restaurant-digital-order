# Xendit Webhook Configuration

To ensure that payments are properly marked as 'paid' after successful completion, you must configure the webhook endpoint in your Xendit dashboard.

## Production Setup

1. Go to your Xendit dashboard
2. Navigate to Settings > Webhook Settings 
3. Set the webhook URL to: `https://yourdomain.com/api/webhooks/xendit`
4. Make sure to use the XENDIT_WEBHOOK_SECRET value that you've configured in your environment variables

## Development Setup

For local development, you'll need to use a tunnel service like ngrok to expose your local server:

1. Start your Next.js development server: `npm run dev`
2. In another terminal, start ngrok: `ngrok http 3000`
3. Copy the ngrok HTTPS URL
4. In your Xendit sandbox dashboard, navigate to Settings > Webhook Settings
5. Set the webhook URL to: `<ngrok-url>/api/webhooks/xendit`

## Environment Variables Required

Make sure these environment variables are set:

```
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_WEBHOOK_SECRET=your_xendit_webhook_secret
```

## Troubleshooting

- Check your application logs for incoming webhook requests
- Verify that the webhook URL is accessible from the internet
- Ensure the XENDIT_WEBHOOK_SECRET matches between your application and Xendit dashboard
- Test the endpoint manually using the debug endpoint at `/api/debug/webhook`