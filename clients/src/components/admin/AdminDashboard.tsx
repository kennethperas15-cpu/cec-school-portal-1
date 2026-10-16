import './AdminDashboard.css';
import './AdminLayout.css';
import type { UserAuthData } from '../auth/Login';

interface AdminDashboardProps {
  currentUser: UserAuthData;
  onNotify: (message: string) => void;
  onLogout: () => void;
}

export function AdminDashboard(_props: AdminDashboardProps) {
  return (
    <div className="admin-screen admin-dashboard-001">
      <div className="admin-dashboard-002">
        <div className="admin-dashboard-003">
          <div className="admin-dashboard-004">
            <div className="admin-dashboard-005" />
            <div className="admin-dashboard-006">
              <div className="admin-dashboard-007">
                <div className="admin-dashboard-008">
                  <div className="admin-dashboard-009" />
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-011">SYSTEM OPERATIONAL • REGISTRY SYNCED (0.04s)</div>
                  </div>
                </div>
                <div className="admin-dashboard-012">
                  <div className="admin-dashboard-013">Welcome back, Dr. Holloway</div>
                </div>
                <div className="admin-dashboard-014">
                  <div className="admin-dashboard-015">Institutional Registry &amp; Administration Workspace • Academic Year 2025–2026,<br/>Second Semester. All biometric gate monitors and enrollment validation queues are<br/>operating nominally.</div>
                </div>
              </div>
              <div className="admin-dashboard-016">
                <div className="admin-dashboard-017">
                  <div className="admin-dashboard-018">
                    <div className="admin-dashboard-019">ACTIVE TERM</div>
                  </div>
                  <div className="admin-dashboard-020">2nd Sem</div>
                </div>
                <div className="admin-dashboard-021">
                  <div className="admin-dashboard-018">
                    <div className="admin-dashboard-019">CENSUS DAY</div>
                  </div>
                  <div className="admin-dashboard-020">Day 42</div>
                </div>
                <div className="admin-dashboard-022">
                  <div className="admin-dashboard-018">
                    <div className="admin-dashboard-019">QUEUE LOAD</div>
                  </div>
                  <div className="admin-dashboard-023">Optimal</div>
                </div>
              </div>
            </div>
          </div>
          <div className="admin-dashboard-024">
            <div className="admin-dashboard-025">
              <div className="admin-dashboard-010">
                <div className="admin-dashboard-026" />
              </div>
              <div className="admin-dashboard-010">
                <div className="admin-dashboard-027">Immediate Actions</div>
              </div>
            </div>
            <div className="admin-dashboard-028">
              <div className="admin-dashboard-029">
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-031" />
                </div>
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-032">Add Student</div>
                </div>
              </div>
              <div className="admin-dashboard-033">
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-034" />
                </div>
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-035">Add Teacher</div>
                </div>
              </div>
              <div className="admin-dashboard-033">
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-034" />
                </div>
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-035">Create Course</div>
                </div>
              </div>
              <div className="admin-dashboard-033">
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-036" />
                </div>
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-035">Assign Schedule</div>
                </div>
              </div>
              <div className="admin-dashboard-037">
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-038" />
                </div>
                <div className="admin-dashboard-030">
                  <div className="admin-dashboard-032">Process Enrollments</div>
                </div>
                <div className="admin-dashboard-039">
                  <div className="admin-dashboard-040">28 Pending</div>
                </div>
              </div>
            </div>
          </div>
          <div className="admin-dashboard-041">
            <div className="admin-dashboard-042">
              <div className="admin-dashboard-006">
                <div className="admin-dashboard-043">
                  <div className="admin-dashboard-044">TOTAL<br/>STUDENTS</div>
                </div>
                <div className="admin-dashboard-045">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-046" />
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-047">
                <div className="admin-dashboard-048">
                  <div className="admin-dashboard-012">
                    <div className="admin-dashboard-049">2,845</div>
                  </div>
                  <div className="admin-dashboard-050">
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-051" />
                    </div>
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-052">+128 this term</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-053">
                    <div className="admin-dashboard-054">Active matriculated</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-dashboard-042">
              <div className="admin-dashboard-006">
                <div className="admin-dashboard-055">
                  <div className="admin-dashboard-044">FACULTY<br/>MEMBERS</div>
                </div>
                <div className="admin-dashboard-056">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-057" />
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-047">
                <div className="admin-dashboard-048">
                  <div className="admin-dashboard-012">
                    <div className="admin-dashboard-049">142</div>
                  </div>
                  <div className="admin-dashboard-058">
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-059" />
                    </div>
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-060">98% clearance</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-053">
                    <div className="admin-dashboard-054">Full-time &amp; Adjunct</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-dashboard-061">
              <div className="admin-dashboard-006">
                <div className="admin-dashboard-062">
                  <div className="admin-dashboard-044">COURSE<br/>CATALOG</div>
                </div>
                <div className="admin-dashboard-063">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-057" />
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-047">
                <div className="admin-dashboard-048">
                  <div className="admin-dashboard-012">
                    <div className="admin-dashboard-049">318</div>
                  </div>
                  <div className="admin-dashboard-058">
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-064" />
                    </div>
                    <div className="admin-dashboard-065">
                      <div className="admin-dashboard-066">8 Academic<br/>Depts</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-053">
                    <div className="admin-dashboard-054">Active modules running</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-dashboard-042">
              <div className="admin-dashboard-067">
                <div className="admin-dashboard-010">
                  <div className="admin-dashboard-044">ENROLLMENTS</div>
                </div>
                <div className="admin-dashboard-068">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-069" />
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-047">
                <div className="admin-dashboard-048">
                  <div className="admin-dashboard-012">
                    <div className="admin-dashboard-049">14,290</div>
                  </div>
                  <div className="admin-dashboard-050">
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-070" />
                    </div>
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-052">Validated Seats</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-053">
                    <div className="admin-dashboard-054">Course registrations</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-dashboard-061">
              <div className="admin-dashboard-067">
                <div className="admin-dashboard-071">
                  <div className="admin-dashboard-044">ACTIVE<br/>CLASSES</div>
                </div>
                <div className="admin-dashboard-072">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-073" />
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-047">
                <div className="admin-dashboard-048">
                  <div className="admin-dashboard-012">
                    <div className="admin-dashboard-049">426</div>
                  </div>
                  <div className="admin-dashboard-058">
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-074" />
                    </div>
                    <div className="admin-dashboard-075">
                      <div className="admin-dashboard-066">Lec &amp; Lab<br/>Sections</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-053">
                    <div className="admin-dashboard-054">Weekly synchronous</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-dashboard-061">
              <div className="admin-dashboard-006">
                <div className="admin-dashboard-076">
                  <div className="admin-dashboard-044">ATTENDANCE<br/>RATE</div>
                </div>
                <div className="admin-dashboard-077">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-078" />
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-047">
                <div className="admin-dashboard-048">
                  <div className="admin-dashboard-012">
                    <div className="admin-dashboard-079">96.2%</div>
                  </div>
                  <div className="admin-dashboard-050">
                    <div className="admin-dashboard-080" />
                    <div className="admin-dashboard-081">
                      <div className="admin-dashboard-052">RFID Biometric<br/>Live</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-053">
                    <div className="admin-dashboard-054">Campus gate sync</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="admin-dashboard-082">
            <div className="admin-dashboard-083">
              <div className="admin-dashboard-084">
                <div className="admin-dashboard-006">
                  <div className="admin-dashboard-085">
                    <div className="admin-dashboard-086">
                      <div className="admin-dashboard-010">
                        <div className="admin-dashboard-087">Pending Enrollment Requests</div>
                      </div>
                      <div className="admin-dashboard-088">
                        <div className="admin-dashboard-089">28 Pending</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-090">Priority course overloads, cross-enlistment, and section requisites requiring<br/>Registrar sign-off</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-091">
                    <div className="admin-dashboard-092">View all<br/>requests</div>
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-093" />
                    </div>
                  </div>
                </div>
                <div className="admin-dashboard-094">
                  <div className="admin-dashboard-095">
                    <div className="admin-dashboard-096">
                      <div className="admin-dashboard-097">
                        <div className="admin-dashboard-098">
                          <div className="admin-dashboard-099">STUDENT PROFILE</div>
                        </div>
                        <div className="admin-dashboard-100">
                          <div className="admin-dashboard-099">PROGRAM<br/>&amp; YEAR</div>
                        </div>
                        <div className="admin-dashboard-101">
                          <div className="admin-dashboard-102">LOAD<br/>UNITS</div>
                        </div>
                        <div className="admin-dashboard-103">
                          <div className="admin-dashboard-099">PRIORITY<br/>STATUS</div>
                        </div>
                        <div className="admin-dashboard-104">
                          <div className="admin-dashboard-105">ACTION</div>
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-106">
                        <div className="admin-dashboard-107">
                          <div className="admin-dashboard-108">
                            <div className="admin-dashboard-109">KP</div>
                          </div>
                          <div className="admin-dashboard-010">
                            <div className="admin-dashboard-012">
                              <div className="admin-dashboard-110">Kenneth<br/>Peras</div>
                            </div>
                            <div className="admin-dashboard-012">
                              <div className="admin-dashboard-111">ID: 2022-<br/>8941-CS</div>
                            </div>
                          </div>
                        </div>
                        <div className="admin-dashboard-112">
                          <div className="admin-dashboard-113">BS<br/>Computer<br/>Science</div>
                          <div className="admin-dashboard-012">
                            <div className="admin-dashboard-114">Year 4 •<br/>Graduating</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-115">
                          <div className="admin-dashboard-116">24</div>
                          <div className="admin-dashboard-117">
                            <div className="admin-dashboard-118">+3<br/>Overload</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-119">
                          <div className="admin-dashboard-120">
                            <div className="admin-dashboard-121" />
                            <div className="admin-dashboard-122">Graduating<br/>Priority</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-123">
                          <div className="admin-dashboard-025">
                            <div className="admin-dashboard-124">
                              <div className="admin-dashboard-125">Approve</div>
                            </div>
                            <div className="admin-dashboard-126">
                              <div className="admin-dashboard-127">Review</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="admin-dashboard-128">
                        <div className="admin-dashboard-107">
                          <div className="admin-dashboard-129">
                            <div className="admin-dashboard-109">MS</div>
                          </div>
                          <div className="admin-dashboard-010">
                            <div className="admin-dashboard-012">
                              <div className="admin-dashboard-110">Maria<br/>Santos</div>
                            </div>
                            <div className="admin-dashboard-012">
                              <div className="admin-dashboard-111">ID: 2023-<br/>1490-IT</div>
                            </div>
                          </div>
                        </div>
                        <div className="admin-dashboard-112">
                          <div className="admin-dashboard-113">BS<br/>Information<br/>Tech</div>
                          <div className="admin-dashboard-012">
                            <div className="admin-dashboard-114">Year 3 •<br/>Regular</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-130">
                          <div className="admin-dashboard-116">21</div>
                          <div className="admin-dashboard-117">
                            <div className="admin-dashboard-127">Regular<br/>Max</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-131">
                          <div className="admin-dashboard-132">
                            <div className="admin-dashboard-133" />
                            <div className="admin-dashboard-134">Prereq<br/>Waiver</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-135">
                          <div className="admin-dashboard-025">
                            <div className="admin-dashboard-124">
                              <div className="admin-dashboard-125">Approve</div>
                            </div>
                            <div className="admin-dashboard-126">
                              <div className="admin-dashboard-127">Review</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="admin-dashboard-128">
                        <div className="admin-dashboard-107">
                          <div className="admin-dashboard-136">
                            <div className="admin-dashboard-109">DT</div>
                          </div>
                          <div className="admin-dashboard-010">
                            <div className="admin-dashboard-012">
                              <div className="admin-dashboard-110">Dave Tan</div>
                            </div>
                            <div className="admin-dashboard-012">
                              <div className="admin-dashboard-111">ID: 2024-<br/>5221-CS</div>
                            </div>
                          </div>
                        </div>
                        <div className="admin-dashboard-112">
                          <div className="admin-dashboard-113">BS<br/>Computer<br/>Science</div>
                          <div className="admin-dashboard-012">
                            <div className="admin-dashboard-114">Year 2 •<br/>Shifter</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-137">
                          <div className="admin-dashboard-116">18</div>
                          <div className="admin-dashboard-117">
                            <div className="admin-dashboard-138">Credited<br/>Lab</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-139">
                          <div className="admin-dashboard-140">
                            <div className="admin-dashboard-141" />
                            <div className="admin-dashboard-089">Cross-<br/>Enlistment</div>
                          </div>
                        </div>
                        <div className="admin-dashboard-142">
                          <div className="admin-dashboard-025">
                            <div className="admin-dashboard-124">
                              <div className="admin-dashboard-125">Approve</div>
                            </div>
                            <div className="admin-dashboard-126">
                              <div className="admin-dashboard-127">Review</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-084">
                <div className="admin-dashboard-006">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-087">Faculty Grade Submission Status</div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-090">Midterm encoding window • 8 Academic divisions oversight</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-143">
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-144" />
                    </div>
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-134">Deadline: 2 Days Remaining</div>
                    </div>
                  </div>
                </div>
                <div className="admin-dashboard-145">
                  <div className="admin-dashboard-146">
                    <div className="admin-dashboard-006">
                      <div className="admin-dashboard-147">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-148">College of Computer Studies</div>
                        </div>
                        <div className="admin-dashboard-149">
                          <div className="admin-dashboard-150">CCS</div>
                        </div>
                      </div>
                      <div className="admin-dashboard-151">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-066">46 Draft • 12 Submitted • 240 Finalized</div>
                        </div>
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-152">92%</div>
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-153">
                      <div className="admin-dashboard-154" />
                    </div>
                  </div>
                  <div className="admin-dashboard-146">
                    <div className="admin-dashboard-006">
                      <div className="admin-dashboard-147">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-148">College of Engineering</div>
                        </div>
                        <div className="admin-dashboard-149">
                          <div className="admin-dashboard-150">COE</div>
                        </div>
                      </div>
                      <div className="admin-dashboard-151">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-066">38 Draft • 24 Submitted • 186 Finalized</div>
                        </div>
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-152">88%</div>
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-153">
                      <div className="admin-dashboard-155" />
                    </div>
                  </div>
                  <div className="admin-dashboard-146">
                    <div className="admin-dashboard-006">
                      <div className="admin-dashboard-147">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-148">College of Arts &amp; Sciences</div>
                        </div>
                        <div className="admin-dashboard-149">
                          <div className="admin-dashboard-150">CAS</div>
                        </div>
                      </div>
                      <div className="admin-dashboard-151">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-066">12 Draft • 8 Submitted • 320 Finalized</div>
                        </div>
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-156">95%</div>
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-153">
                      <div className="admin-dashboard-157" />
                    </div>
                  </div>
                  <div className="admin-dashboard-158">
                    <div className="admin-dashboard-006">
                      <div className="admin-dashboard-147">
                        <div className="admin-dashboard-159">
                          <div className="admin-dashboard-160">College of Business &amp;<br/>Administration</div>
                        </div>
                        <div className="admin-dashboard-161">
                          <div className="admin-dashboard-122">Flagged • Needs<br/>Follow-up</div>
                        </div>
                      </div>
                      <div className="admin-dashboard-151">
                        <div className="admin-dashboard-162">
                          <div className="admin-dashboard-111">64 Draft • 30 Pending • 142<br/>Finalized</div>
                        </div>
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-163">79%</div>
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-153">
                      <div className="admin-dashboard-164" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-084">
                <div className="admin-dashboard-006">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-087">Upcoming Milestones &amp; Institutional Calendar</div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-090">Scheduled academic phases for AY 2025–2026 Term 2</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-165">
                    <div className="admin-dashboard-166">Academic Calendar</div>
                    <div className="admin-dashboard-030">
                      <div className="admin-dashboard-167" />
                    </div>
                  </div>
                </div>
                <div className="admin-dashboard-041">
                  <div className="admin-dashboard-168">
                    <div className="admin-dashboard-048">
                      <div className="admin-dashboard-006">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-169">EXAMINATION PHASE</div>
                        </div>
                        <div className="admin-dashboard-170" />
                      </div>
                      <div className="admin-dashboard-012">
                        <div className="admin-dashboard-171">Midterm<br/>Examination Week</div>
                      </div>
                      <div className="admin-dashboard-012">
                        <div className="admin-dashboard-172">Central proctor<br/>assignment and proctored<br/>lab booking locks.</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-047">
                      <div className="admin-dashboard-173">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-167" />
                        </div>
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-134">March 16 – 20, 2026</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="admin-dashboard-168">
                    <div className="admin-dashboard-048">
                      <div className="admin-dashboard-006">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-174">REGISTRAR CUTOFF</div>
                        </div>
                        <div className="admin-dashboard-175" />
                      </div>
                      <div className="admin-dashboard-012">
                        <div className="admin-dashboard-171">Final Course Drop<br/>Deadline</div>
                      </div>
                      <div className="admin-dashboard-012">
                        <div className="admin-dashboard-172">Hard freeze for dropping<br/>modules without grade<br/>penalty.</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-047">
                      <div className="admin-dashboard-173">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-176" />
                        </div>
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-134">March 04, 2026</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="admin-dashboard-168">
                    <div className="admin-dashboard-048">
                      <div className="admin-dashboard-006">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-177">GOVERNANCE</div>
                        </div>
                        <div className="admin-dashboard-178" />
                      </div>
                      <div className="admin-dashboard-012">
                        <div className="admin-dashboard-171">Faculty Academic<br/>Council</div>
                      </div>
                      <div className="admin-dashboard-012">
                        <div className="admin-dashboard-172">Curricular modifications<br/>and candidate list for<br/>honor societies.</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-047">
                      <div className="admin-dashboard-173">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-179" />
                        </div>
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-134">March 28, 2026</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-dashboard-180">
              <div className="admin-dashboard-084">
                <div className="admin-dashboard-006">
                  <div className="admin-dashboard-010">
                    <div className="admin-dashboard-087">Live Activity Audit</div>
                  </div>
                  <div className="admin-dashboard-178" />
                </div>
                <div className="admin-dashboard-181">
                  <div className="admin-dashboard-182">
                    <div className="admin-dashboard-183">
                      <div className="admin-dashboard-184">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-185" />
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-186">
                      <div className="admin-dashboard-187">
                        <div className="admin-dashboard-188"><span className="admin-dashboard-284">Grade correction authorized by<br/></span><span className="admin-dashboard-285">Dr. Holloway</span><span className="admin-dashboard-284"> for </span><span className="admin-dashboard-284">CS 302</span><span className="admin-dashboard-284">.</span></div>
                      </div>
                      <div className="admin-dashboard-189">12 mins ago • Registrar Session</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-182">
                    <div className="admin-dashboard-183">
                      <div className="admin-dashboard-190">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-191" />
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-192">
                      <div className="admin-dashboard-193">
                        <div className="admin-dashboard-188"><span className="admin-dashboard-284">New student matriculation<br/>verified for </span><span className="admin-dashboard-285">Kenneth Peras</span><span className="admin-dashboard-284"><br/>(BSCS-IV).</span></div>
                      </div>
                      <div className="admin-dashboard-194">34 mins ago • Admissions Unit</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-182">
                    <div className="admin-dashboard-183">
                      <div className="admin-dashboard-195">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-196" />
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-192">
                      <div className="admin-dashboard-193">
                        <div className="admin-dashboard-188"><span className="admin-dashboard-284">Room schedule overlap<br/>resolved: Assigned </span><span className="admin-dashboard-284">Lab 402</span><span className="admin-dashboard-284"> to<br/>Engr. Reyes.</span></div>
                      </div>
                      <div className="admin-dashboard-194">1 hr ago • System Scheduler</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-182">
                    <div className="admin-dashboard-183">
                      <div className="admin-dashboard-195">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-197" />
                        </div>
                      </div>
                    </div>
                    <div className="admin-dashboard-192">
                      <div className="admin-dashboard-193">
                        <div className="admin-dashboard-188"><span className="admin-dashboard-284">Course syllabus version<br/>archived: </span><span className="admin-dashboard-284">IT 312 Systems</span><span className="admin-dashboard-284"><br/></span><span className="admin-dashboard-284">Integration</span><span className="admin-dashboard-284">.</span></div>
                      </div>
                      <div className="admin-dashboard-194">3 hrs ago • Academic Dep</div>
                    </div>
                  </div>
                </div>
                <div className="admin-dashboard-198">
                  <div className="admin-dashboard-199">View Complete Institutional Log</div>
                </div>
              </div>
              <div className="admin-dashboard-084">
                <div className="admin-dashboard-006">
                  <div className="admin-dashboard-200">
                    <div className="admin-dashboard-087">Announcements<br/>Bulletin</div>
                  </div>
                  <div className="admin-dashboard-201">
                    <div className="admin-dashboard-030">
                      <div className="admin-dashboard-202" />
                    </div>
                    <div className="admin-dashboard-203">
                      <div className="admin-dashboard-125">+ New<br/>Broadcast</div>
                    </div>
                  </div>
                </div>
                <div className="admin-dashboard-181">
                  <div className="admin-dashboard-204">
                    <div className="admin-dashboard-006">
                      <div className="admin-dashboard-010">
                        <div className="admin-dashboard-060">FACULTY MEMORANDUM</div>
                      </div>
                      <div className="admin-dashboard-010">
                        <div className="admin-dashboard-111">Today, 09:15</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-205">Midterm Grade Portal Closure<br/>Notice</div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-172">Broadcast delivered to all 142 teaching<br/>faculty. Submission locks on Friday at<br/>23:59 sharp.</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-204">
                    <div className="admin-dashboard-006">
                      <div className="admin-dashboard-010">
                        <div className="admin-dashboard-066">CAMPUS OPERATIONS</div>
                      </div>
                      <div className="admin-dashboard-010">
                        <div className="admin-dashboard-111">Yesterday</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-205">Campus Wi-Fi &amp; Registry<br/>Network Upgrade</div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-172">Centralized gateway firmware<br/>deployment scheduled on Sunday<br/>(01:00 AM – 03:00 AM).</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-204">
                    <div className="admin-dashboard-006">
                      <div className="admin-dashboard-010">
                        <div className="admin-dashboard-052">REGISTRY PROTOCOL</div>
                      </div>
                      <div className="admin-dashboard-010">
                        <div className="admin-dashboard-111">Feb 24</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-205">Graduation Clearance<br/>Protocol v2.4 Published</div>
                    </div>
                    <div className="admin-dashboard-012">
                      <div className="admin-dashboard-172">Automated student clearance workflow<br/>now available for senior department<br/>counselors.</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-dashboard-084">
                <div className="admin-dashboard-006">
                  <div className="admin-dashboard-147">
                    <div className="admin-dashboard-010">
                      <div className="admin-dashboard-206" />
                    </div>
                    <div className="admin-dashboard-207">
                      <div className="admin-dashboard-087">Security &amp;<br/>Infrastructure</div>
                    </div>
                  </div>
                  <div className="admin-dashboard-208">
                    <div className="admin-dashboard-209" />
                    <div className="admin-dashboard-210">Secure</div>
                  </div>
                </div>
                <div className="admin-dashboard-211">
                  <div className="admin-dashboard-212">
                    <div className="admin-dashboard-213">
                      <div className="admin-dashboard-214">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-038" />
                        </div>
                      </div>
                      <div className="admin-dashboard-215">
                        <div className="admin-dashboard-066">ACTIVE SESSIONS</div>
                        <div className="admin-dashboard-110">456<br/>Authenticated</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-216">
                      <div className="admin-dashboard-217">418<br/>Students</div>
                      <div className="admin-dashboard-218">
                        <div className="admin-dashboard-219">38 Faculty</div>
                      </div>
                    </div>
                  </div>
                  <div className="admin-dashboard-212">
                    <div className="admin-dashboard-213">
                      <div className="admin-dashboard-220">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-221" />
                        </div>
                      </div>
                      <div className="admin-dashboard-222">
                        <div className="admin-dashboard-066">DATABASE<br/>SNAPSHOT</div>
                        <div className="admin-dashboard-110">04:00 AM<br/>Today</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-216">
                      <div className="admin-dashboard-223">
                        <div className="admin-dashboard-216">
                          <div className="admin-dashboard-070" />
                        </div>
                        <div className="admin-dashboard-224">Verified<br/>100%</div>
                      </div>
                    </div>
                  </div>
                  <div className="admin-dashboard-212">
                    <div className="admin-dashboard-213">
                      <div className="admin-dashboard-225">
                        <div className="admin-dashboard-010">
                          <div className="admin-dashboard-226" />
                        </div>
                      </div>
                      <div className="admin-dashboard-227">
                        <div className="admin-dashboard-066">SERVER REPLICATION</div>
                        <div className="admin-dashboard-228">Cloudflare Edge Multi-</div>
                        <div className="admin-dashboard-228">Zone</div>
                      </div>
                    </div>
                    <div className="admin-dashboard-229">
                      <div className="admin-dashboard-230">14ms<br/>latency</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="admin-dashboard-231">
        <div className="admin-dashboard-232">
          <div className="admin-dashboard-010">
            <div className="admin-dashboard-012">
              <div className="admin-dashboard-087">Admin Portal</div>
            </div>
            <div className="admin-dashboard-012">
              <div className="admin-dashboard-066">School Management<br/>System</div>
            </div>
          </div>
          <div className="admin-dashboard-233">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-234" />
            </div>
            <div className="admin-dashboard-235">
              <div className="admin-dashboard-236">AY 2025–2026 • 2nd<br/>Semester</div>
            </div>
          </div>
        </div>
        <div className="admin-dashboard-232">
          <div className="admin-dashboard-237">
            <div className="admin-dashboard-238">
              <div className="admin-dashboard-239">
                <div className="admin-dashboard-240">Search student ID, course, faculty...</div>
              </div>
            </div>
            <div className="admin-dashboard-241">
              <div className="admin-dashboard-242" />
            </div>
          </div>
          <div className="admin-dashboard-243">
            <div className="admin-dashboard-244">
              <div className="admin-dashboard-030">
                <div className="admin-dashboard-245" />
              </div>
              <div className="admin-dashboard-246" />
            </div>
            <div className="admin-dashboard-244">
              <div className="admin-dashboard-030">
                <div className="admin-dashboard-247" />
              </div>
              <div className="admin-dashboard-248" />
            </div>
          </div>
          <div className="admin-dashboard-249">
            <div className="admin-dashboard-250" />
          </div>
          <div className="admin-dashboard-147">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-251">
                <div className="admin-dashboard-252">Dr. Margaret Holloway</div>
              </div>
              <div className="admin-dashboard-251">
                <div className="admin-dashboard-253">Chief Academic Administrator /<br/>System Registrar</div>
              </div>
            </div>
            <div className="admin-dashboard-254">
              <div className="admin-dashboard-010">
                <div className="admin-dashboard-255" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="admin-dashboard-256">
        <div className="admin-dashboard-257">
          <div className="admin-dashboard-258">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-259" />
            </div>
          </div>
          <div className="admin-dashboard-010">
            <div className="admin-dashboard-260">
              <div className="admin-dashboard-261">AERO SIS</div>
            </div>
            <div className="admin-dashboard-053">
              <div className="admin-dashboard-066">Institutional Registry</div>
            </div>
          </div>
        </div>
        <div className="admin-dashboard-262">
          <div className="admin-dashboard-263">
            <div className="admin-dashboard-243">
              <div className="admin-dashboard-170" />
              <div className="admin-dashboard-010">
                <div className="admin-dashboard-134">AY 2025–2026</div>
              </div>
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-150">2nd Sem</div>
            </div>
          </div>
        </div>
        <div className="admin-dashboard-264">
          <div className="admin-dashboard-265">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-266" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-267">Dashboard</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-269" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Student Management</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-271" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Teacher Management</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-272" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Course Management</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-273" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Class Schedule</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-274" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Enrollment Management</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-275" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Grades Management</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-276" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Attendance Management</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-277" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">User Accounts</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-278" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Announcements</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-279" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Settings</div>
            </div>
          </div>
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-280" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-270">Activity Logs</div>
            </div>
          </div>
        </div>
        <div className="admin-dashboard-281">
          <div className="admin-dashboard-268">
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-282" />
            </div>
            <div className="admin-dashboard-010">
              <div className="admin-dashboard-283">Logout</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
