import Image from "next/image";
import pencils from "../../../public/site/portal-pencils.jpg";

/**
 * The portal's background: a row of coloured pencils along the bottom of the screen.
 * Fixed behind everything, so it stays put while pages scroll; a light blue-grey wash keeps white cards distinct.
 */
export function PortalBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 print:hidden">
      <Image src={pencils} alt="" fill priority={false} placeholder="blur" sizes="100vw" className="object-cover" style={{ objectPosition: "center bottom" }} />
      <div className="absolute inset-0 bg-[#E2E7F0]/30" />
    </div>
  );
}
