import Image from "next/image";
import pencils from "../../../public/site/portal-pencils.jpg";
import mark from "../../../public/brand/crest-mark.png";

/**
 * The portal's background: a row of coloured pencils along the bottom of the screen.
 * Fixed behind everything, so it stays put while pages scroll; a light blue-grey wash keeps white cards distinct.
 *
 * On paper (reports, invoices) the same pencils run faintly along the foot of every page, with the Crest mark
 * as a watermark in the middle. Fixed elements repeat on each printed page.
 */
export function PortalBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 print:hidden">
        <Image src={pencils} alt="" fill placeholder="blur" sizes="100vw" className="object-cover" style={{ objectPosition: "center bottom" }} />
        <div className="absolute inset-0 bg-[#E2E7F0]/30" />
      </div>

      {/* Print only. Plain <img> so the pictures are always loaded and printed, whatever the "background graphics" setting. */}
      <div aria-hidden className="print-backdrop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark.src} alt="" className="print-watermark" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pencils.src} alt="" className="print-pencils" />
      </div>
    </>
  );
}
