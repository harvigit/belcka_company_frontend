export const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: '#111827',
    mb: 0.5,
};

export const subLabelStyle = {
    fontSize: 11,
    color: '#6B7280',
    mb: 0.75,
};

export const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '6px',
        fontSize: 13,
        bgcolor: '#fff',
    },
    '& .MuiOutlinedInput-input, & .MuiInputBase-input, & input, & textarea': {
        py: 0.9,
        textAlign: 'left !important',
    },
};

export const timeOptions = Array.from({length: 96}, (_, index) => {
    const hours = Math.floor((index * 15) / 60);
    const minutes = (index * 15) % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});
