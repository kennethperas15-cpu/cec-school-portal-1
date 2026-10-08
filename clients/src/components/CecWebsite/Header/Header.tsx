import "./style.css";

interface HeaderProps {
  onApply: () => void;
  onLogin: () => void;
}

export const Header = ({ onApply, onLogin }: HeaderProps): JSX.Element => {
  return (
    <header className="header">
      <div className="frame">
        <div className="div" />
        <div className="frame-2">
          <div className="text-wrapper">Cebu Eastern College</div>
          <div className="text-wrapper-2">Established 1915</div>
        </div>
      </div>
      <div className="navbar">
        <div className="text-wrapper-3">About</div>
        <div className="text-wrapper-3">Academics</div>
        <div className="text-wrapper-3">Admissions</div>
        <div className="text-wrapper-3">Research</div>
      </div>
      <div className="frame">
        <button className="div-wrapper" type="button" onClick={onApply}>
          <div className="text-wrapper-4">Apply Now</div>
        </button>
        <button className="frame-3" type="button" onClick={onLogin}>
          <div className="text-wrapper-5">Portal</div>
        </button>
        <img
          className="img"
          alt="Frame"
          src="https://c.animaapp.com/WdkSJjqp/img/frame-1.svg"
        />
      </div>
    </header>
  );
};
