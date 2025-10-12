import React from 'react';

import { useEffectOnce } from '@/hooks/useEffectOnce';

interface PublicThemesProps {
  onLoaded?: () => void;
}

const PublicThemes: React.FC<PublicThemesProps> = ({ onLoaded }) => {
  useEffectOnce(onLoaded);

  return <div>PublicThemes</div>;
};

export default PublicThemes;
