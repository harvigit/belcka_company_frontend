import React from 'react';
import {
    IconBorderHorizontal,
    IconBoxMultiple,
    IconCalendar,
    IconCheck,
    IconChevronDown,
    IconClipboardList,
    IconFileDescription,
    IconHash,
    IconMail,
    IconMapPin,
    IconMathFunction,
    IconMicrophone,
    IconPencil,
    IconPhone,
    IconPhoto,
    IconScan,
    IconSignature,
    IconStarHalf,
    IconUpload,
    IconVideo,
} from '@tabler/icons-react';
import {FieldDraft, FormField} from './types';

export type FieldDef = { label: string; icon: React.ReactNode };

export const LAYOUT_FIELDS: FieldDef[] = [
    {label: 'Description', icon: <IconFileDescription size={15}/>},
    {label: 'Formula', icon: <IconMathFunction size={15}/>},
    {label: 'Group', icon: <IconBoxMultiple size={15}/>},
];

export const ELEMENT_FIELDS: FieldDef[] = [
    {label: 'Dropdown', icon: <IconChevronDown size={15}/>},
    {label: 'Number', icon: <IconHash size={15}/>},
    {label: 'Open ended', icon: <IconPencil size={15}/>},
    {label: 'Yes/No', icon: <IconCheck size={15}/>},
    {label: 'Scanner', icon: <IconScan size={15}/>},
    {label: 'Image selection', icon: <IconPhoto size={15}/>},
    {label: 'Location', icon: <IconMapPin size={15}/>},
    {label: 'Audio recording', icon: <IconMicrophone size={15}/>},
    {label: 'Task', icon: <IconCheck size={15}/>},
    {label: 'Date', icon: <IconCalendar size={15}/>},
    {label: 'Rating', icon: <IconStarHalf size={15}/>},
    {label: 'Signature', icon: <IconSignature size={15}/>},
    {label: 'Image upload', icon: <IconPhoto size={15}/>},
    {label: 'Video upload', icon: <IconVideo size={15}/>},
    {label: 'File upload', icon: <IconUpload size={15}/>},
    {label: 'Numbers slider', icon: <IconBorderHorizontal size={15}/>},
    {label: 'Phone', icon: <IconPhone size={15}/>},
    {label: 'Email', icon: <IconMail size={15}/>},
];

export const iconForType = (type: string) => {
    if (type.includes('Image') || type.includes('Video') || type.includes('File')) return <IconPhoto size={17}/>;
    if (type === 'Date') return <IconCalendar size={17}/>;
    if (type === 'Location') return <IconMapPin size={17}/>;
    if (type === 'Number' || type === 'Numbers slider') return <IconHash size={17}/>;
    if (type === 'Open ended' || type === 'Description') return <IconPencil size={17}/>;
    if (type === 'Audio recording') return <IconMicrophone size={17}/>;
    if (type === 'Rating') return <IconStarHalf size={17}/>;
    if (type === 'Signature') return <IconSignature size={17}/>;
    if (type === 'Task') return <IconCheck size={17}/>;
    if (type === 'Phone') return <IconPhone size={17}/>;
    if (type === 'Email') return <IconMail size={17}/>;
    return <IconClipboardList size={17}/>;
};

export const normalizeFields = (fields: unknown): FormField[] =>
    Array.isArray(fields)
        ? fields
        : fields && typeof fields === 'object' && Array.isArray((fields as any).items)
            ? (fields as any).items
            : [];

export const optionFieldTypes = ['Dropdown', 'Image selection'];

export const defaultLabelForType = (_type: string) => '';

export const placeholderForType = (type: string) => {
    if (type === 'Description') return 'Description text';
    if (type === 'Formula') return 'Formula name';
    if (type === 'Group') return 'Group name';
    if (type === 'Task') return 'Task';
    return 'Question';
};

export const emptyDraftForType = (type: string): FieldDraft => ({
    label: defaultLabelForType(type),
    description: '',
    required: false,
    options: optionFieldTypes.includes(type) || type === 'Yes/No' ? ['', ''] : [],
    optionImages: type === 'Image selection' ? ['', ''] : [],
    optionSortMode: 'custom',
    minValue: 0,
    maxValue: 0,
    ratingStarCount: 5,
    ratingMinLabel: '',
    ratingMaxLabel: '',
    locationStampCapture: false,
    multipleSelection: false,
    imageSource: 'both',
    videoSource: 'both',
    scannerSource: 'both',
    locationSelectBy: 'current',
    allowMultipleUploads: false,
    dateIncludeDate: true,
    dateIncludeTime: false,
    formulaExpression: '',
    showOnlyIf: false,
    conditionFieldId: '',
    conditionOperator: 'empty',
    conditionValue: '',
    conditions: [],
});
