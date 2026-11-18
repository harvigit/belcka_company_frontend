import React from 'react';
import {Tooltip} from '@mui/material';

interface ActionPermissionTooltipProps {
    allowed: boolean;
    title: string;
    children: React.ReactElement;
}

// Shows why a Time Clock action button is disabled (Bookkeeper Setting → Timesheet actions).
// The span is needed because a disabled button doesn't fire the hover events Tooltip listens to.
const ActionPermissionTooltip: React.FC<ActionPermissionTooltipProps> = ({allowed, title, children}) => {
    if (allowed) return children;

    return (
        <Tooltip title={title} arrow placement="top">
            <span style={{display: 'inline-flex', cursor: 'not-allowed'}}>{children}</span>
        </Tooltip>
    );
};

export default ActionPermissionTooltip;
