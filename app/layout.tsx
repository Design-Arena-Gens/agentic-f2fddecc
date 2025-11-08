export const metadata = {
  title: 'Rajasthani Village 8K Cinematic Render',
  description: 'Client-side photorealistic render using Stable Diffusion Turbo, HDR, and 8K upscaling.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji' }}>
        {children}
      </body>
    </html>
  );
}
