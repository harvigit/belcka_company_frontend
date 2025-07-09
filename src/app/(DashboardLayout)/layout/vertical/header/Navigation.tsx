import { useState } from 'react';
import React from 'react';

const AppDD = () => {
  const [anchorEl2, setAnchorEl2] = useState<HTMLElement | null>(null);

  const handleClick2 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };



  return null;
};

export default AppDD;
