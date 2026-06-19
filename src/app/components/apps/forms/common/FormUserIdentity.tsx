import React from 'react';
import {Avatar, Box, Stack, Typography} from '@mui/material';

export type FormUserIdentityValue = {
    id?: string | number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    trade_name?: string | null;
    user_image?: string | null;
    user_thumb_image?: string | null;
    createdBy_thumb_image?: string | null;
    admin_thumb_image?: string | null;
};

export const getFormUserName = (user?: FormUserIdentityValue | null) => (
    user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || '-'
);

export const getFormUserTradeName = (user?: FormUserIdentityValue | null) => (
    user?.trade_name || '-'
);

export const getFormUserImage = (user?: FormUserIdentityValue | null) => (
    user?.user_image || user?.user_thumb_image || user?.createdBy_thumb_image || user?.admin_thumb_image || '/images/users/user.png'
);

export const getFormUserInitials = (user?: FormUserIdentityValue | null) => (
    getFormUserName(user).split(/\s+/).filter(Boolean).slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase()).join('') || 'U'
);

const FormUserIdentity = ({user}: { user?: FormUserIdentityValue | null; }) =>
{
    const name = getFormUserName(user);
    const tradeName = getFormUserTradeName(user);
    const image = getFormUserImage(user);

    return (
        <Stack direction="row" alignItems="center" sx={{minWidth: 0}}>
            <Avatar
                src={image}
                alt={name}
                sx={{ width: 36, height: 36, cursor: 'pointer' }}
            />

            <Box  ml={2}>
                <Typography
                    className="f-14"
                    color="textPrimary"
                    sx={{
                        cursor: 'pointer',
                        '&:hover': { color: '#173f98' },
                        width: 190,
                    }}
                >
                    {name}
                </Typography>
                
                <Typography
                    color="textSecondary"
                    variant="subtitle1"
                    width={190}
                    noWrap
                >
                    {tradeName}
                </Typography>
            </Box>
        </Stack>
    );
};

export default FormUserIdentity;
