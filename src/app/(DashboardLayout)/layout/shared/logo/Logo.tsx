"use client";
import { useContext } from "react";

import config from "@/app/context/config";
import Image from "next/image";
import { CustomizerContext } from "@/app/context/customizerContext";

const Logo = () => {
  const { isCollapse, isSidebarHover, activeDir, activeMode } =
    useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  if (activeDir === "ltr") {
    return (
      <>
        {activeMode === "dark" ? (
          <Image
            src={"/images/logos/belcka.svg"}
            alt="logo"
            height={TopbarHeight}
            width={150}
            style={{ marginLeft: 10 }}
            priority
          />
        ) : (
          <Image
            src={"/images/logos/belcka.svg"}
            alt="logo"
            height={TopbarHeight}
            width={150}
            style={{ marginLeft: 10 }}
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
          src={"/images/logos/belcka.svg"}
          alt="logo"
          height={TopbarHeight}
          width={150}
          style={{ marginLeft: 10 }}
          priority
        />
      ) : (
        <Image
          src={"/images/logos/belcka.svg"}
          alt="logo"
          height={TopbarHeight}
          style={{ marginLeft: 10 }}
          width={150}
          priority
        />
      )}
    </>
  );
};

export default Logo;
