import "./style.css";

interface HeroProps {
  onApply: () => void;
  onLogin: () => void;
}

export const Hero = ({ onApply, onLogin }: HeroProps): JSX.Element => {
  return (
    <div className="hero">
      <div className="frame-4">
        <div className="frame-5">
          <div className="frame-6">
            <div className="text-wrapper-6">110-YEAR COLLEGIATE LEGACY</div>
          </div>
          <p className="p">
            Fostering Excellence, Character, and Innovation Since 1915
          </p>
          <p className="text-wrapper-7">
            Cebu Eastern College provides accredited undergraduate degree
            programs, advanced technology laboratories, and values-centered
            holistic education right in the heart of Cebu City.
          </p>
          <div className="frame-7">
            <button className="enter-student-wrapper" type="button" onClick={onLogin}>
              <p className="enter-student">
                Enter Student &amp; Faculty Portal
              </p>
            </button>
            <button className="frame-8" type="button" onClick={onApply}>
              <div className="text-wrapper-8">Apply for Enrollment</div>
            </button>
          </div>
        </div>
        <div className="frame-9">
          <div className="frame-10">
            <div className="frame-11">
              <div className="text-wrapper-9">Editorial Visual</div>
            </div>
            <div className="text-wrapper-10">Campus Life</div>
          </div>
          <div className="frame-12">
            <div className="text-wrapper-11">Modern Academic Excellence</div>
            <p className="text-wrapper-12">
              A century of heritage meets modern research, industry
              partnerships, and student-centered vitality in the heart of Cebu
              City.
            </p>
          </div>
          <div className="frame-13">
            <img
              className="frame-14"
              alt="Frame"
              src="https://c.animaapp.com/WdkSJjqp/img/frame-2.svg"
            />
            <div className="text-wrapper-13">Watch Campus Story</div>
          </div>
        </div>
      </div>
      <div className="frame-15">
        <div className="frame-16">
          <div className="text-wrapper-14">110+</div>
          <div className="text-wrapper-15">Years of Heritage</div>
          <div className="text-wrapper-10">
            Centennial Filipino-Chinese institution
          </div>
        </div>
        <div className="frame-17">
          <div className="text-wrapper-14">100%</div>
          <div className="text-wrapper-15">CHED &amp; DepEd Recognized</div>
          <div className="text-wrapper-10">
            Level III Institutional Compliance
          </div>
        </div>
        <div className="frame-18">
          <div className="text-wrapper-14">15:1</div>
          <div className="text-wrapper-15">Faculty Mentorship Ratio</div>
          <div className="text-wrapper-10">
            Personalized academic supervision
          </div>
        </div>
        <div className="frame-19">
          <div className="text-wrapper-14">94.8%</div>
          <div className="text-wrapper-15">Licensure Passing Rate</div>
          <div className="text-wrapper-16">First-time PRC takers, 2024</div>
        </div>
      </div>
    </div>
  );
};