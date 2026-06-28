import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 88,
        background: '#17545e',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontFamily: 'system-ui',
        borderRadius: 28,
      }}
    >
      P
    </div>,
    { width: 128, height: 128 }
  );
}
