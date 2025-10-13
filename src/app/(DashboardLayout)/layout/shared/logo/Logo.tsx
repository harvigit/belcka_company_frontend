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
    width: isCollapse == "mini-sidebar" && !isSidebarHover ? "65px" : "150px",
    overflow: "hidden",
    display: "block",
    marginBottom: "10px",
    marginTop: "5px",
    marginLeft: "-5px",
  }));

  if (activeDir === "ltr") {
    return (
      <>
        {activeMode === "dark" ? (
          <Image
            src={"/images/logos/belcka.png"}
            alt="logo"
            height={TopbarHeight}
            width={150}
            priority
          />
        ) : (
          <Image
            src={"/images/logos/belcka.png"}
            alt="logo"
            height={TopbarHeight}
            width={150}
            priority
          />
        )}
      </>
    );
  }

  return (
    <>
      {activeMode === "dark" ? (
        <Image
          src={"/images/logos/belcka.png"}
          alt="logo"
          height={TopbarHeight}
          width={150}
          priority
        />
      ) : (
        <Image
          src={"/images/logos/belcka.png"}
          alt="logo"
          height={TopbarHeight}
          width={150}
          priority
        />
      )}
    </>
  );
};

export default Logo;
