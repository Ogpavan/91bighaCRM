import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { VendorScripts } from "@/components/vendor-scripts";
import "./globals.css";

const assetBase = "/assets";

export const metadata: Metadata = {
  title: "Bareilly Property Portal | 91bigha.com",
  description:
    "91bigha.com helps buyers and tenants discover property listings, rentals, and local opportunities across Bareilly."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
        <link rel="shortcut icon" href={`${assetBase}/img/favicon.png`} />
        <link rel="apple-touch-icon" href={`${assetBase}/img/apple-icon.png`} />
        <link rel="stylesheet" href={`${assetBase}/css/bootstrap.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/material-icon/material-icon.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/fontawesome/css/fontawesome.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/fontawesome/css/all.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/select2/css/select2.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/css/aos.css`} />
        <link rel="stylesheet" href={`${assetBase}/css/bootstrap-datetimepicker.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/fancybox/jquery.fancybox.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/simplebar/simplebar.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/ion-rangeslider/css/ion.rangeSlider.min.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/slick/slick.css`} />
        <link rel="stylesheet" href={`${assetBase}/plugins/slick/slick-theme.css`} />
        <link rel="stylesheet" href={`${assetBase}/css/style.css`} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
        <VendorScripts />
      </body>
    </html>
  );
}
