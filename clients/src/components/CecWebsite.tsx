import { AdmissionsRoadmap } from "./CecWebsite/Admission";
import { CampusLife } from "./CecWebsite/CampusLife";
import { CampusVisit } from "./CecWebsite/CampusVisit";
import { Footer } from "./CecWebsite/Footer";
import { Header } from "./CecWebsite/Header";
import { Hero } from "./CecWebsite/Hero";
import { ProgramsSection } from "./CecWebsite/ProgramsSection";
import "./style.css";

export const CecWebsite = (): JSX.Element => {
  return (
    <div className="CEC-WEBSITE" data-model-id="338:670">
      <Header />
      <Hero />
      <ProgramsSection />
      <CampusLife />
      <AdmissionsRoadmap />
      <CampusVisit />
      <Footer />
    </div>
  );
};