import React from 'react';
import { Typography, Stack } from '@mui/material';
import * as dropdownData from './data';
import Link from 'next/link';

const QuickLinks = () => {
    return (
        <>
            <Typography variant="h5" fontWeight={600}>Quick Links</Typography>
            <Stack spacing={2} mt={2}>
                {dropdownData.pageLinks.map((pagelink, index) => (
                    <Link href={pagelink.href} key={index} className="hover-text-primary">
                        <Typography
                            variant="subtitle2"
                            color="textPrimary"
                            className="text-hover"
                            fontWeight={500}
                        >
                            {pagelink.title}
                        </Typography>
                    </Link>
                ))}
            </Stack>
        </>
    );
};

export default QuickLinks;
