import { AdmissionsRoadmap } from "./CecWebsite/AdmissionsRoadmap";
import { CampusLife } from "./CecWebsite/CampusLife";
import { CampusVisit } from "./CecWebsite/CampusVisit";
import { Footer } from "./CecWebsite/Footer";
import { Header } from "./CecWebsite/Header";
import { Hero } from "./CecWebsite/Hero";
import { ProgramsSection } from "./CecWebsite/ProgramsSection";
import "./style.css";

interface CecWebsiteProps {
  onApply: () => void;
  onLogin: () => void;
}

export const CecWebsite = ({ onApply, onLogin }: CecWebsiteProps): JSX.Element => {
  return (
    <div className="CEC-WEBSITE" data-model-id="338:670">
      <Header onApply={onApply} onLogin={onLogin} />
      <Hero onApply={onApply} onLogin={onLogin} />
      <ProgramsSection />
      <CampusLife />
      <AdmissionsRoadmap onApply={onApply} />
      <CampusVisit />
      <Footer />
    </div>
  );
};