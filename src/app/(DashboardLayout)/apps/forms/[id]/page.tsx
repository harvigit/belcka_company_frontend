'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageContainer from '@/app/components/container/PageContainer';
import FormBuilder from '@/app/components/apps/forms/FormBuilder';

const FormEditorPage = () => {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const formId = params?.id;

    const closeEditor = () => {
        router.push('/apps/forms');
    };

    return (
        <PageContainer title="Form Builder">
            <FormBuilder
                open
                onClose={closeEditor}
                formId={formId}
                onSaved={closeEditor}
            />
        </PageContainer>
    );
};

export default FormEditorPage;
