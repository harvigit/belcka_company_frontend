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
    {code: 'en', shortLabel: 'EN', label: 'English'},
    {code: 'pl', shortLabel: 'PL', label: 'Polish'},
    {code: 'ru', shortLabel: 'RU', label: 'Russian'},
    {code: 'uk', shortLabel: 'UA', label: 'Ukrainian'},
];

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
                    <Avatar
                        sx={{
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            fontWeight: 700,
                            bgcolor: 'grey.600',
                        }}
                    >
                        {selectedLanguage.shortLabel}
                    </Avatar>
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
                        <Avatar
                            sx={{
                                width: 26,
                                height: 26,
                                mr: 1,
                                fontSize: 11,
                                fontWeight: 700,
                                bgcolor: 'grey.600',
                            }}
                        >
                            {language.shortLabel}
                        </Avatar>
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
