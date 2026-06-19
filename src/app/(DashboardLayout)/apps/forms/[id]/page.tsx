'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import PageContainer from '@/app/components/container/PageContainer';
import FormDetails from '@/app/components/apps/forms/FormDetails';

const FormDetailsPage = () => {
    const params = useParams<{ id: string }>();
    const formId = params?.id;

    return (
        <PageContainer title="Form Details">
            {formId ? (
                <FormDetails formId={formId} />
            ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                    <CircularProgress />
                </Box>
            )}
        </PageContainer>
    );
};

export default FormDetailsPage;
