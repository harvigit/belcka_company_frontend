'use client';

import React, {useEffect, useState} from 'react';
import {TextField} from '@mui/material';

const PRICE_PATTERN = /^\d*(?:\.\d{0,2})?$/;

type PriceInputProps = {
    value: string;
    disabled?: boolean;
    emphasized?: boolean;
    onCommit: (value: string) => void;
};

const PriceInput = React.memo(({value, disabled = false, emphasized = false, onCommit}: PriceInputProps) => {
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    const commit = () => {
        if (disabled || draft === value) return;
        onCommit(draft);
    };

    return (
        <TextField
            size="small"
            value={draft}
            disabled={disabled}
            onChange={(event) => {
                if (PRICE_PATTERN.test(event.target.value)) {
                    setDraft(event.target.value);
                }
            }}
            onBlur={commit}
            placeholder="0.00"
            sx={{
                width: 90,
                '& .MuiInputBase-input': {
                    fontSize: '0.825rem',
                    py: 0.5,
                    px: 0.5,
                    fontWeight: emphasized ? 700 : 400,
                    color: emphasized ? '#0f172a' : '#94a3b8',
                    textAlign: 'center',
                },
            }}
        />
    );
});

PriceInput.displayName = 'PriceInput';

export default PriceInput;
