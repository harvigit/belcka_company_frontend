// 'use client';
//
// import {
//     Box,
//     Typography,
//     Tabs,
//     Tab,
//     Card,
//     CardContent,
//     Button,
//     IconButton,
//     Menu,
//     MenuItem,
//     Divider
// } from '@mui/material';
// import React, { useState } from 'react';
// import {
//     IconX,
//     IconTrash,
//     IconScissors,
//     IconChevronDown,
//     IconChevronUp,
//     IconClock,
//     IconInfoCircle
// } from '@tabler/icons-react';
//
// interface ConflictItem {
//     start: string;
//     end: string;
//     shift_name: string;
//     color?: string;
//     worklog_id?: string;
//     project?: string;
// }
//
// interface Conflict {
//     date: string;
//     items: ConflictItem[];
// }
//
// interface ConflictsProps {
//     conflictDetails: Conflict[];
//     totalConflicts: number;
//     onClose: () => void;
//     onDeleteWorklog: (worklogId: string) => void;
//     onCutWorklog?: (worklogId: string, cutType: 'start' | 'end') => void;
// }
//
// export default function Conflicts({
//                                       conflictDetails,
//                                       totalConflicts,
//                                   }: ConflictsProps) {
//     const [tab, setTab] = useState(0);
//     const [cutAnchorEl, setCutAnchorEl] = useState<null | HTMLElement>(null);
//     const [deleteAnchorEl, setDeleteAnchorEl] = useState<null | HTMLElement>(null);
//     const [activeConflictIndex, setActiveConflictIndex] = useState<number | null>(null);
//
//     const handleMenuOpen = (
//         e: React.MouseEvent<HTMLElement>,
//         type: 'cut' | 'delete',
//         conflictIndex: number
//     ) => {
//         e.stopPropagation();
//         setActiveConflictIndex(conflictIndex);
//         if (type === 'cut') {
//             setCutAnchorEl(e.currentTarget);
//             setDeleteAnchorEl(null);
//         } else {
//             setDeleteAnchorEl(e.currentTarget);
//             setCutAnchorEl(null);
//         }
//     };
//
//     const handleMenuClose = () => {
//         setCutAnchorEl(null);
//         setDeleteAnchorEl(null);
//         setActiveConflictIndex(null);
//     };
//
//     const handleDeleteWorklog = (worklogId: string) => {
//         handleMenuClose();
//     };
//
//     const handleCutWorklog = (worklogId: string, cutType: 'start' | 'end') => {
//         handleMenuClose();
//     };
//
//     const getShiftColor = (color?: string) => {
//         return color || '#e3f2fd';
//     };
//
//     const getCurrentConflict = () => {
//         return activeConflictIndex !== null ? conflictDetails[activeConflictIndex] : null;
//     };
//
//     return (
//         <Box sx={{
//             display: 'flex',
//             flexDirection: 'column',
//             height: '100vh',
//             backgroundColor: '#fff',
//             borderLeft: '1px solid #e0e0e0'
//         }}>
//             {/* Header */}
//             <Box
//                 sx={{
//                     display: 'flex',
//                     alignItems: 'center',
//                     px: 2,
//                     py: 1.5,
//                     borderBottom: '1px solid #e0e0e0',
//                     backgroundColor: '#fafafa',
//                 }}
//             >
//                 <IconButton
//                     sx={{
//                         mr: 1,
//                         p: 0.5,
//                         '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
//                     }}
//                 >
//                     <IconX size={18} />
//                 </IconButton>
//                 <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
//                     Conflicts ({totalConflicts})
//                 </Typography>
//             </Box>
//
//             {/* Tabs */}
//             <Tabs
//                 value={tab}
//                 onChange={(_, v) => setTab(v)}
//                 variant="fullWidth"
//                 sx={{
//                     borderBottom: '1px solid #e0e0e0',
//                     minHeight: '48px',
//                     '& .MuiTab-root': {
//                         textTransform: 'none',
//                         fontSize: '0.875rem',
//                         fontWeight: 500,
//                         minHeight: '48px',
//                         color: '#666',
//                         '&.Mui-selected': {
//                             color: '#1976d2',
//                             fontWeight: 600
//                         }
//                     },
//                     '& .MuiTabs-indicator': {
//                         backgroundColor: '#1976d2',
//                         height: '2px'
//                     }
//                 }}
//             >
//                 <Tab label="Open conflicts" />
//                 <Tab label="History" />
//             </Tabs>
//
//             {/* Content */}
//             <Box sx={{ flex: 1, overflow: 'hidden' }}>
//                 {tab === 0 && (
//                     <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
//                         {conflictDetails.map((conflict, idx) => (
//                             <Card
//                                 key={idx}
//                                 sx={{
//                                     mb: 2,
//                                     borderRadius: '8px',
//                                     boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
//                                     border: '1px solid #e0e0e0',
//                                     borderTop: 0,
//                                     '&:hover': {
//                                         boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
//                                     }
//                                 }}
//                                 variant="outlined"
//                             >
//                                 <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
//                                     {/* Date Header */}
//                                     <Box sx={{
//                                         display: 'flex',
//                                         justifyContent: 'space-between',
//                                         alignItems: 'center',
//                                         mb: 2
//                                     }}>
//                                         <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
//                                             {conflict.date}
//                                         </Typography>
//                                         <IconButton
//                                             size="small"
//                                             sx={{
//                                                 color: 'text.secondary',
//                                                 p: 0.5,
//                                                 '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
//                                             }}
//                                             onClick={() => {/* Handle individual conflict dismiss */}}
//                                         >
//                                             <IconX size={16} />
//                                         </IconButton>
//                                     </Box>
//
//                                     {/* Conflict Items */}
//                                     <Box sx={{ mb: 2 }}>
//                                         {conflict.items.map((item, i) => (
//                                             <Box key={i} sx={{ position: 'relative', mb: 1 }}>
//                                                 <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
//                                                     <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
//                                                         {item.start}
//                                                     </Typography>
//                                                     <Typography variant="body2" color="text.secondary"
//                                                                 sx={{ fontSize: '0.75rem' }}>
//                                                         {item.end}
//                                                     </Typography>
//                                                 </Box>
//                                                 <Box
//                                                     sx={{
//                                                         borderRadius: 1,
//                                                         bgcolor: item.color || '#e0e0e0',
//                                                         display: 'flex',
//                                                         alignItems: 'center',
//                                                         justifyContent: 'center',
//                                                         fontSize: '0.875rem',
//                                                         fontWeight: 500
//                                                     }}
//                                                 >
//                                                     {item.shift_name}
//                                                 </Box>
//                                             </Box>
//                                         ))}
//                                     </Box>
//
//                                     {/* Action Buttons */}
//                                     <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
//                                         <Button
//                                             size="small"
//                                             startIcon={<IconScissors size={16} />}
//                                             endIcon={
//                                                 (cutAnchorEl && activeConflictIndex === idx) ?
//                                                     <IconChevronUp size={16} /> :
//                                                     <IconChevronDown size={16} />
//                                             }
//                                             onClick={(e) => handleMenuOpen(e, 'cut', idx)}
//                                             sx={{
//                                                 textTransform: 'none',
//                                                 fontSize: '0.8rem',
//                                                 fontWeight: 500,
//                                                 borderRadius: '6px',
//                                                 px: 2,
//                                                 py: 0.5,
//                                                 border: '1px solid #1976d2',
//                                                 color: '#1976d2',
//                                                 backgroundColor: 'transparent',
//                                                 '&:hover': {
//                                                     backgroundColor: 'rgba(25, 118, 210, 0.04)',
//                                                     color: '#1976d2', 
//                                                 }
//                                             }}
//                                         >
//                                             Cut start/end
//                                         </Button>
//
//                                         <Button
//                                             size="small"
//                                             startIcon={<IconTrash size={16} />}
//                                             endIcon={
//                                                 (deleteAnchorEl && activeConflictIndex === idx) ?
//                                                     <IconChevronUp size={16} /> :
//                                                     <IconChevronDown size={16} />
//                                             }
//                                             onClick={(e) => handleMenuOpen(e, 'delete', idx)}
//                                             sx={{
//                                                 textTransform: 'none',
//                                                 fontSize: '0.8rem',
//                                                 fontWeight: 500,
//                                                 borderRadius: '6px',
//                                                 px: 2,
//                                                 py: 0.5,
//                                                 border: '1px solid #f44336',
//                                                 color: '#f44336',
//                                                 backgroundColor: 'transparent',
//                                                 '&:hover': {
//                                                     backgroundColor: 'rgba(244, 67, 54, 0.04)',
//                                                     color: '#f44336',
//                                                 }
//                                             }}
//                                         >
//                                             Delete
//                                         </Button>
//                                     </Box>
//                                 </CardContent>
//                             </Card>
//                         ))}
//
//                         {/* Cut Menu */}
//                         <Menu
//                             anchorEl={cutAnchorEl}
//                             open={Boolean(cutAnchorEl) && activeConflictIndex !== null}
//                             onClose={handleMenuClose}
//                             PaperProps={{
//                                 sx: {
//                                     mt: 1,
//                                     boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
//                                     borderRadius: '8px',
//                                     border: '1px solid #e0e0e0',
//                                     minWidth: '320px',
//                                     maxWidth: '400px'
//                                 },
//                             }}
//                             transformOrigin={{ horizontal: 'left', vertical: 'top' }}
//                             anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
//                         >
//                             <Box sx={{ p: 2 }}>
//                                 <Typography variant="body2" sx={{
//                                     fontSize: '0.875rem',
//                                     mb: 2,
//                                     color: '#333',
//                                     fontWeight: 500
//                                 }}>
//                                     Cut the overlapping hours from the:
//                                 </Typography>
//
//                                 {getCurrentConflict()?.items.map((item, i) => (
//                                     <Box key={i} sx={{ mb: i === getCurrentConflict()!.items.length - 1 ? 0 : 1.5 }}>
//                                         <Box sx={{
//                                             display: 'flex',
//                                             alignItems: 'center',
//                                             justifyContent: 'space-between',
//                                             p: 1.5,
//                                             borderRadius: '6px',
//                                             border: '1px solid #e0e0e0',
//                                             backgroundColor: '#fafafa'
//                                         }}>
//                                             <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
//                                                 <Typography variant="body2" sx={{
//                                                     fontSize: '0.8rem',
//                                                     mr: 1,
//                                                     color: '#666'
//                                                 }}>
//                                                     End of
//                                                 </Typography>
//                                                 <Typography variant="body2" sx={{
//                                                     fontSize: '0.8rem',
//                                                     fontWeight: 600,
//                                                     color: '#333',
//                                                     mr: 1
//                                                 }}>
//                                                     {item.shift_name}
//                                                 </Typography>
//                                                 <Typography variant="body2" sx={{
//                                                     fontSize: '0.75rem',
//                                                     color: '#666',
//                                                     backgroundColor: '#fff',
//                                                     px: 1,
//                                                     py: 0.25,
//                                                     borderRadius: '4px',
//                                                     border: '1px solid #e0e0e0'
//                                                 }}>
//                                                     {item.start} – {item.end}
//                                                 </Typography>
//                                             </Box>
//                                             <Button
//                                                 size="small"
//                                                 variant="contained"
//                                                 onClick={() => item.worklog_id && handleCutWorklog(item.worklog_id, 'end')}
//                                                 disabled={!item.worklog_id}
//                                                 sx={{
//                                                     textTransform: 'none',
//                                                     fontSize: '0.75rem',
//                                                     backgroundColor: '#1976d2',
//                                                     '&:hover': { backgroundColor: '#1565c0' },
//                                                     borderRadius: '6px',
//                                                     px: 2,
//                                                     py: 0.5,
//                                                     minWidth: '60px',
//                                                     ml: 2
//                                                 }}
//                                             >
//                                                 Cut
//                                             </Button>
//                                         </Box>
//                                     </Box>
//                                 ))}
//                             </Box>
//                         </Menu>
//
//                         {/* Delete Menu */}
//                         <Menu
//                             anchorEl={deleteAnchorEl}
//                             open={Boolean(deleteAnchorEl) && activeConflictIndex !== null}
//                             onClose={handleMenuClose}
//                             PaperProps={{
//                                 sx: {
//                                     mt: 1,
//                                     boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
//                                     borderRadius: '8px',
//                                     border: '1px solid #e0e0e0',
//                                     minWidth: '320px',
//                                     maxWidth: '400px'
//                                 }
//                             }}
//                             transformOrigin={{ horizontal: 'left', vertical: 'top' }}
//                             anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
//                         >
//                             <Box sx={{ p: 1 }}>
//                                 <Typography variant="body2" sx={{
//                                     fontSize: '0.875rem',
//                                     mb: 1,
//                                     px: 1,
//                                     color: '#333',
//                                     fontWeight: 500
//                                 }}>
//                                     Select which shift to delete:
//                                 </Typography>
//                                 {getCurrentConflict()?.items.map((item, i) => (
//                                     <MenuItem
//                                         key={i}
//                                         sx={{
//                                             fontSize: '0.8rem',
//                                             py: 1.5,
//                                             px: 1,
//                                             borderRadius: '6px',
//                                             mx: 0.5,
//                                             mb: 0.5,
//                                             display: 'flex',
//                                             justifyContent: 'space-between',
//                                             alignItems: 'center',
//                                             '&:hover': {
//                                                 backgroundColor: '#f5f5f5'
//                                             }
//                                         }}
//                                         onClick={(e) => e.stopPropagation()}
//                                     >
//                                         <Box sx={{ flex: 1 }}>
//                                             <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, mb: 0.5 }}>
//                                                 {item.shift_name}
//                                             </Typography>
//                                             <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>
//                                                 {item.start} → {item.end}
//                                             </Typography>
//                                         </Box>
//                                         {item.worklog_id && (
//                                             <Button
//                                                 size="small"
//                                                 variant="outlined"
//                                                 onClick={(e) => {
//                                                     e.stopPropagation();
//                                                     handleDeleteWorklog(item.worklog_id!);
//                                                 }}
//                                                 sx={{
//                                                     ml: 2,
//                                                     textTransform: 'none',
//                                                     fontSize: '0.75rem',
//                                                     borderColor: '#f44336',
//                                                     color: '#f44336',
//                                                     '&:hover': {
//                                                         backgroundColor: 'rgba(244, 67, 54, 0.04)',
//                                                         borderColor: '#f44336',
//                                                         color: '#f44336',
//                                                     },
//                                                     borderRadius: '6px',
//                                                     px: 2,
//                                                     py: 0.5,
//                                                     minWidth: '70px'
//                                                 }}
//                                             >
//                                                 Delete
//                                             </Button>
//                                         )}
//                                     </MenuItem>
//                                 ))}
//                             </Box>
//                         </Menu>
//                     </Box>
//                 )}
//
//                 {tab === 1 && (
//                     <Box sx={{
//                         display: 'flex',
//                         flexDirection: 'column',
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         height: '100%',
//                         px: 3,
//                         textAlign: 'center'
//                     }}>
//                         <IconClock size={48} color="#ccc" style={{ marginBottom: '16px' }} />
//                         <Typography variant="body1" sx={{
//                             color: '#666',
//                             fontSize: '0.9rem',
//                             mb: 1
//                         }}>
//                             No history yet
//                         </Typography>
//                         <Typography variant="body2" sx={{
//                             color: '#999',
//                             fontSize: '0.8rem',
//                             maxWidth: '250px'
//                         }}>
//                             Resolved conflicts will appear here for future reference
//                         </Typography>
//                     </Box>
//                 )}
//             </Box>
//
//             {/* Learn about conflicts section (if needed) */}
//             {conflictDetails.length === 0 && tab === 0 && (
//                 <Box sx={{
//                     p: 3,
//                     borderTop: '1px solid #e0e0e0',
//                     backgroundColor: '#fafafa'
//                 }}>
//                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
//                         <IconInfoCircle size={16} color="#1976d2" style={{ marginRight: '8px' }} />
//                         <Typography variant="body2" sx={{
//                             fontSize: '0.85rem',
//                             fontWeight: 500,
//                             color: '#1976d2'
//                         }}>
//                             Learn about conflicts
//                         </Typography>
//                     </Box>
//                     <Typography variant="body2" sx={{
//                         fontSize: '0.8rem',
//                         color: '#666',
//                         lineHeight: 1.4
//                     }}>
//                         Conflicts occur when shifts overlap in time. Use the tools above to resolve them.
//                     </Typography>
//                 </Box>
//             )}
//         </Box>
//     );
// }
