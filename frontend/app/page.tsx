import { Hero }      from "@/components/marketing/Hero";
import { Features }   from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CtaBanner }  from "@/components/marketing/CtaBanner";
import { Footer }     from "@/components/marketing/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <CtaBanner />
      <Footer />
    </>
  );
}
