import { Switch, SwitchProps } from '@mui/material';
import { styled } from '@mui/material/styles';

const IOSSwitch = styled((props: SwitchProps) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 42, 
    height: 25,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(17px)', 
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#1e4db7', 
                opacity: 1,
                border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
            },
        },
        '&.Mui-focusVisible .MuiSwitch-thumb': {
            color: '#1e4db7',
            border: '4px solid #fff', 
        },
        '&.Mui-disabled .MuiSwitch-thumb': {
            color: '#fff',
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: 0.3,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 21, 
        height: 21,
    },
    '& .MuiSwitch-track': {
        borderRadius: 25 / 2,
        backgroundColor: '#E0E0E0', // iOS gray
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 300,
        }),
        border: '1px dashed #ccc',
    },
}));

export default IOSSwitch;
