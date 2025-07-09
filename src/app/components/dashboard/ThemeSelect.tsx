import React from 'react';

import { styled } from '@mui/material';
import { Select, MenuItem, InputBase } from '@mui/material';

const BootstrapInput = styled(InputBase)(({ theme }) => ({
  '&  .MuiInputBase-root': {
    borderRadius: '5px',
  },
  '& .MuiInputBase-input': {
    backgroundColor: theme.palette.mode === 'light' ? 'white' : theme.palette.background.paper,
    borderRadius: 5,
    fontSize: 15,
    padding: '8px 33px 8px 16px',
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    border: "1px solid" + theme.palette.divider,
  },
}));

const ThemeSelect = () => {
  const [age, setAge] = React.useState<string>('10');

  const handleChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setAge(event.target.value);
  };

  return (
    <Select
      labelId="demo-simple-select-label"
      id="demo-simple-select"
      value={age}
      onChange={handleChange}
      input={<BootstrapInput />}
    >
      <MenuItem value={10}>March 2025</MenuItem>
      <MenuItem value={20}>April 2025</MenuItem>
      <MenuItem value={30}>May 2025</MenuItem>
    </Select>
  );
};

export default ThemeSelect;
