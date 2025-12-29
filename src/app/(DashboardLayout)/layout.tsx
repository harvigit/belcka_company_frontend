"use client";

import { styled, Container, Box, useTheme } from "@mui/material";
import React, { useContext, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "./layout/vertical/header/Header";
import Sidebar from "./layout/vertical/sidebar/Sidebar";
import Customizer from "./layout/shared/customizer/Customizer";
import Navigation from "./layout/horizontal/navbar/Navigation";
import HorizontalHeader from "./layout/horizontal/header/Header";
import { CustomizerContext } from "@/app/context/customizerContext";
import AuthGuard from "@/app/auth/AuthGuard";
import config from "../context/config";

const MainWrapper = styled("div")(() => ({
    display: "flex",
    minHeight: "100vh",
    width: "100%",
}));

const PageWrapper = styled("div")(() => ({
    display: "flex",
    flexGrow: 1,
    paddingBottom: "60px",
    flexDirection: "column",
    zIndex: 1,
    backgroundColor: "transparent",
    overflowX: "hidden",
}));

interface Props {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const { activeLayout, isLayout, activeMode, isCollapse } =
        useContext(CustomizerContext);
    const MiniSidebarWidth = config.miniSidebarWidth;

    const theme = useTheme();
    const { data: session, status } = useSession();

    // Show loading state while checking authentication
    if (status === "loading") {
        return null;
    }

    return (
        <AuthGuard>
            <MainWrapper>
                {activeLayout === "horizontal" ? "" : <Sidebar />}
                <PageWrapper
                    className="page-wrapper"
                    sx={{
                        ...(isCollapse === "mini-sidebar" && {
                            [theme.breakpoints.up("lg")]: {
                                ml: `${MiniSidebarWidth}px`,
                            },
                        }),
                    }}
                >
                    {activeLayout === "horizontal" ? <HorizontalHeader /> : <Header />}
                    {activeLayout === "horizontal" ? <Navigation /> : ""}
                    <Container
                        sx={{
                            maxWidth:
                                isLayout === "boxed" ? "2500px !important" : "100%!important",
                        }}
                    >
                        <Box sx={{ minHeight: "calc(100vh - 170px)" }}>{children}</Box>
                    </Container>
                    <Customizer />
                </PageWrapper>
            </MainWrapper>
        </AuthGuard>
    );
}
