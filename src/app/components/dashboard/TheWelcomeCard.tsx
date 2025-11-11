import React, { useContext } from "react";
import Image from "next/image";
import { Card, CardContent, Button, Typography, Box } from "@mui/material";
import { CustomizerContext } from "@/app/context/customizerContext";

const WelcomeCard = () => {
    const { activeDir } = useContext(CustomizerContext);

    return (
        <Card
            elevation={0}
            sx={{
                position: "relative",
                backgroundColor: (theme) => theme.palette.primary.light,
                minHeight: '200px',
                '&:before': {
                    content: `""`,
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    background: `url('/images/backgrounds/welcome-bg.png')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    transform: activeDir === "rtl" ? 'scaleX(-1)' : 'unset',
                    backgroundPosition:
                        activeDir === "rtl" ? 'right 64px top' : 'right',
                },
                borderWidth: '0px',
            }}
        >
            <CardContent sx={{ minHeight: '168px' }}>
                <Typography
                    sx={{
                        marginTop: '8px',
                        marginBottom: '0px',
                        lineHeight: '35px',
                        position: 'relative',
                        zIndex: 9,
                    }}
                    variant="h3"
                    fontSize='20px'
                    gutterBottom
                >
                    Hey Johnathan,
                </Typography>
            </CardContent>
        </Card>
    );
};

export default WelcomeCard;
