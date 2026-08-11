import React, {useContext, useState} from 'react';
import {
    Avatar,
    Box,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import {IconChevronDown} from '@tabler/icons-react';
import {useTranslation} from 'react-i18next';
import {CustomizerContext} from '@/app/context/customizerContext';

const languages = [
    {
        code: 'en',
        shortLabel: 'EN',
        label: 'English',
        flag: '/images/flags/en.svg',
    },
    {
        code: 'pl',
        shortLabel: 'PL',
        label: 'Polish',
        flag: '/images/flags/pl.svg',
    },
    {
        code: 'ru',
        shortLabel: 'RU',
        label: 'Russian',
        flag: '/images/flags/ru.svg',
    },
    {
        code: 'uk',
        shortLabel: 'UA',
        label: 'Ukrainian',
        flag: '/images/flags/uk.svg',
    },
];

const FlagAvatar = ({
    flag,
    label,
    size = 26,
}: {
    flag: string;
    label: string;
    size?: number;
}) => (
    <Avatar
        src={flag}
        alt={label}
        variant="circular"
        imgProps={{
            loading: 'eager',
            draggable: false,
        }}
        sx={{
            width: size,
            height: size,
            bgcolor: 'transparent',
            border: '1px solid',
            borderColor: 'divider',
            '& img': {
                objectFit: 'cover',
            },
        }}
    />
);

const Language = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const {isLanguage, setIsLanguage} = useContext(CustomizerContext);
    const {t, i18n} = useTranslation();

    const selectedLanguage =
        languages.find((language) => language.code === isLanguage) || languages[0];

    const handleChangeLanguage = (languageCode: string) => {
        setIsLanguage(languageCode);
        window.localStorage.setItem('belcka_language', languageCode);
        void i18n.changeLanguage(languageCode);
        setAnchorEl(null);
    };

    return (
        <Box>
            <Tooltip title={t('Language')}>
                <IconButton
                    color="inherit"
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                    sx={{gap: 0.5}}
                >
                    <FlagAvatar
                        flag={selectedLanguage.flag}
                        label={selectedLanguage.label}
                        size={30}
                    />
                    <IconChevronDown size="16"/>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
                transformOrigin={{horizontal: 'right', vertical: 'top'}}
            >
                {languages.map((language) => (
                    <MenuItem
                        key={language.code}
                        selected={selectedLanguage.code === language.code}
                        onClick={() => handleChangeLanguage(language.code)}
                    >
                        <Box sx={{mr: 1, display: 'flex'}}>
                            <FlagAvatar flag={language.flag} label={language.label} />
                        </Box>
                        <ListItemText
                            primary={
                                <Typography variant="body2">
                                    {t(language.label)}
                                </Typography>
                            }
                        />
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};

export default Language;
