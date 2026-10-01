import "./style.css";

interface AdmissionsRoadmapProps {
  onApply: () => void;
}

export const AdmissionsRoadmap = ({ onApply }: AdmissionsRoadmapProps): JSX.Element => {
  return (
    <div className="admissions-roadmap">
      <div className="frame-40">
        <div className="text-wrapper-32">ADMISSIONS ROADMAP</div>
        <p className="text-wrapper-33">Four Steps to Becoming an Easternian</p>
        <p className="text-wrapper-34">
          Our streamlined admissions process ensures rapid document evaluation,
          guided course advisement, and immediate portal credentials.
        </p>
      </div>
      <div className="frame-41">
        <div className="frame-42">
          <div className="frame-43">
            <div className="text-wrapper-35">1</div>
          </div>
          <div className="text-wrapper-36">Submit Online Application</div>
          <p className="text-wrapper-37">
            Fill out the digital applicant profile and upload scanned copies of
            Form 138/137 or Certificate of Good Moral Character.
          </p>
          <div className="frame-44">
            <img
              className="img-4"
              alt="Clock"
              src="https://c.animaapp.com/WdkSJjqp/img/clock-1.svg"
            />
            <div className="text-wrapper-38">Average time: 10 mins</div>
          </div>
        </div>
        <div className="frame-42">
          <div className="frame-43">
            <div className="text-wrapper-35">2</div>
          </div>
          <div className="text-wrapper-36">Guidance &amp; Assessment</div>
          <p className="text-wrapper-37">
            Undergo an aptitude diagnostic and receive personalized academic
            counseling tailored to your vocational aspirations.
          </p>
          <div className="frame-44">
            <img
              className="img-4"
              alt="Check circle"
              src="https://c.animaapp.com/WdkSJjqp/img/check-circle.svg"
            />
            <div className="text-wrapper-39">Free Evaluation</div>
          </div>
        </div>
        <div className="frame-42">
          <div className="frame-43">
            <div className="text-wrapper-35">3</div>
          </div>
          <div className="text-wrapper-36">Course Block Selection</div>
          <p className="text-wrapper-37">
            Lock in your preferred lecture sections and settle your downpayment
            via digital banking, Maya, GCash, or over-the-counter.
          </p>
          <div className="frame-44">
            <img
              className="img-4"
              alt="Credit card"
              src="https://c.animaapp.com/WdkSJjqp/img/credit-card.svg"
            />
            <div className="text-wrapper-39">Multi-Payment Gateways</div>
          </div>
        </div>
        <div className="frame-45">
          <div className="frame-43">
            <div className="text-wrapper-35">4</div>
          </div>
          <p className="text-wrapper-36">Claim Smart ID &amp; Portal</p>
          <p className="text-wrapper-40">
            Collect your biometric RFID student card at the Registrar desk and
            automatically activate your Kenneth-tier portal dashboard.
          </p>
          <div className="frame-44">
            <img
              className="img-4"
              alt="Check circle"
              src="https://c.animaapp.com/WdkSJjqp/img/check-circle-1.svg"
            />
            <div className="text-wrapper-38">Ready for Classes</div>
          </div>
        </div>
      </div>
      <div className="frame-46">
        <div className="frame-47">
          <img
            className="frame-48"
            alt="Frame"
            src="https://c.animaapp.com/WdkSJjqp/img/frame-10.svg"
          />
          <div className="frame-49">
            <p className="admissions-are-open">
              Admissions are Open for 2nd Semester &amp; AY 2025–2026
            </p>
            <p className="tuition-discount">
              Tuition discount vouchers available for honor graduates &amp;
              siblings.
            </p>
          </div>
        </div>
        <button className="frame-50" type="button" onClick={onApply}>
          <div className="text-wrapper-41">Start Enrollment Application</div>
        </button>
      </div>
    </div>
  );
};