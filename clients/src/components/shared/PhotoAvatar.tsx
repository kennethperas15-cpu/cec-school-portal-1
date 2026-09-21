import React from 'react';
import { getPhoto } from '../../services/photos';

type Props = { userId: string; name: string; size?: number; bg?: string };

export const PhotoAvatar: React.FC<Props> = ({ userId, name, size = 36, bg = '#0B3D91' }) => {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => { setSrc(getPhoto(userId)); }, [userId]);
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '•';
  if (src) {
    return <img src={src} alt={`${name} profile photo`} width={size} height={size} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div aria-label={`${name} (no photo yet)`} style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.36, flexShrink: 0 }}>
      {initials}
    </div>
  );
};
