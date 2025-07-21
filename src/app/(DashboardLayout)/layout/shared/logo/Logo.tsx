"use client";
import { useContext } from "react";

import Link from "next/link";
import { styled } from "@mui/material";
import config from "@/app/context/config";
import Image from "next/image";
import { CustomizerContext } from "@/app/context/customizerContext";

const Logo = () => {
  const { isCollapse, isSidebarHover, activeDir, activeMode } =
    useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isCollapse == "mini-sidebar" && !isSidebarHover ? "50px" : "150px",
    overflow: "hidden",
    display: "block",
    marginBottom: "10px",
    marginTop:'5px'
  }));

  if (activeDir === "ltr") {
    return (
      <LinkStyled href="/">
        {activeMode === "dark" ? (
          <Image
            src={"/images/logos/belcka.png"}
            alt="logo"
            height={TopbarHeight}
            width={117}
            priority
          />
        ) : (
          <Image
            src={"/images/logos/belcka.png"}
            alt="logo"
            height={TopbarHeight}
            width={117}
            priority
          />
        )}
      </LinkStyled>
    );
  }

  return (
    <LinkStyled href="/">
      {activeMode === "dark" ? (
        <Image
          src={"/images/logos/belcka.png"}
          alt="logo"
          height={TopbarHeight}
          width={117}
          priority
        />
      ) : (
        <Image
          src={"/images/logos/belcka.png"}
          alt="logo"
          height={TopbarHeight}
          width={117}
          priority
        />
      )}
    </LinkStyled>
  );
};

export default Logo;
