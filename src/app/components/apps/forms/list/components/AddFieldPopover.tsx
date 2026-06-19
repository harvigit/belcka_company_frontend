import React from 'react';
import {Box, Popover, Stack, Typography} from '@mui/material';
import {ELEMENT_FIELDS, LAYOUT_FIELDS} from '../../common/formBuilderConstants';

type AddFieldPopoverProps = {
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onAdd: (type: string) => void;
};

const AddFieldPopover = ({anchorEl, onClose, onAdd}: AddFieldPopoverProps) => (
    <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
        PaperProps={{
            elevation: 4,
            sx: {
                mt: 1,
                borderRadius: 2,
                width: {xs: '90vw', sm: 560},
                maxHeight: {xs: '60vh', sm: 400},
                overflow: 'auto',
            },
        }}
    >
        <Box sx={{p: {xs: 2, sm: 2.5}}}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {xs: '1fr', sm: '180px 1fr'},
                    gap: {xs: 2, sm: 3},
                }}
            >
                {/* Layout */}
                <Box>
                    <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        sx={{textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75, display: 'block'}}
                    >
                        Layout
                    </Typography>
                    
                    <Stack spacing={0.25}>
                        {LAYOUT_FIELDS.map((f) => (
                            <Stack
                                key={f.label}
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                onClick={() => {
                                    onAdd(f.label);
                                }}
                                sx={{
                                    px: 1.25,
                                    py: 0.875,
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    '&:hover': {bgcolor: 'action.hover'},
                                }}
                            >
                                <Box sx={{color: 'text.secondary', display: 'flex'}}>{f.icon}</Box>
                                <Typography fontSize={13}>{f.label}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                {/* Elements */}
                <Box>
                    <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        sx={{textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75, display: 'block'}}
                    >
                        Elements
                    </Typography>
                    
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 0,
                        }}
                    >
                        {ELEMENT_FIELDS.map((f) => (
                            <Stack
                                key={f.label}
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                onClick={() => {
                                    onAdd(f.label);
                                }}
                                sx={{
                                    px: 1.25,
                                    py: 0.875,
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    '&:hover': {bgcolor: 'action.hover'},
                                }}
                            >
                                <Box
                                    sx={{color: 'text.secondary', display: 'flex', flexShrink: 0}}
                                >
                                    {f.icon}
                                </Box>
                                <Typography fontSize={13} noWrap>{f.label}</Typography>
                            </Stack>
                        ))}
                    </Box>
                </Box>
            </Box>
        </Box>
    </Popover>
);

export default AddFieldPopover;
