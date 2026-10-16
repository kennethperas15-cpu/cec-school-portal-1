import './TeacherDashBoard.css';
import '../student/PortalLayout.css';
import type { UserAuthData } from '../auth/Login';

interface TeacherDashboardProps {
  currentUser: UserAuthData;
  onNotify: (message: string) => void;
  onLogout: () => void;
}

export function TeacherDashboard(_props: TeacherDashboardProps) {
  return (
    <div className="teacher-screen teacher-dashboard-001">
      <div className="teacher-dashboard-002">
        <div className="teacher-dashboard-003">
          <div className="teacher-dashboard-004">
            <div className="teacher-dashboard-005">
              <div className="teacher-dashboard-006">
                <div className="teacher-dashboard-007">
                  <div className="teacher-dashboard-008" />
                  <div className="teacher-dashboard-009">
                    <div className="teacher-dashboard-010">SPRING TERM AY 2025–2026 • WEEK 9</div>
                  </div>
                </div>
                <div className="teacher-dashboard-011">
                  <div className="teacher-dashboard-012">Good morning, Professor Vance</div>
                </div>
                <div className="teacher-dashboard-011">
                  <div className="teacher-dashboard-013">You have 2 scheduled lectures and 1 lab critique today. Room 402 is<br/>prepared.</div>
                </div>
              </div>
              <div className="teacher-dashboard-014">
                <div className="teacher-dashboard-015">
                  <div className="teacher-dashboard-016">
                    <div className="teacher-dashboard-017" />
                  </div>
                  <div className="teacher-dashboard-016">
                    <div className="teacher-dashboard-018">Take Attendance</div>
                  </div>
                </div>
                <div className="teacher-dashboard-019">
                  <div className="teacher-dashboard-016">
                    <div className="teacher-dashboard-020" />
                  </div>
                  <div className="teacher-dashboard-016">
                    <div className="teacher-dashboard-021">Encode Grades</div>
                  </div>
                </div>
                <div className="teacher-dashboard-022">
                  <div className="teacher-dashboard-016">
                    <div className="teacher-dashboard-023" />
                  </div>
                  <div className="teacher-dashboard-016">
                    <div className="teacher-dashboard-024">View Class Roster</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="teacher-dashboard-004">
            <div className="teacher-dashboard-025">
              <div className="teacher-dashboard-026">
                <div className="teacher-dashboard-027" />
                <div className="teacher-dashboard-028">
                  <div className="teacher-dashboard-005">
                    <div className="teacher-dashboard-009">
                      <div className="teacher-dashboard-029">TOTAL STUDENTS</div>
                    </div>
                    <div className="teacher-dashboard-030">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-031" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="teacher-dashboard-032">
                  <div className="teacher-dashboard-011">
                    <div className="teacher-dashboard-033">184</div>
                  </div>
                  <div className="teacher-dashboard-007">
                    <div className="teacher-dashboard-009">
                      <div className="teacher-dashboard-034" />
                    </div>
                    <div className="teacher-dashboard-035">
                      <div className="teacher-dashboard-036">Assigned across 5 active<br/>sections</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="teacher-dashboard-026">
                <div className="teacher-dashboard-037" />
                <div className="teacher-dashboard-028">
                  <div className="teacher-dashboard-005">
                    <div className="teacher-dashboard-009">
                      <div className="teacher-dashboard-029">TOTAL CLASSES</div>
                    </div>
                    <div className="teacher-dashboard-038">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-039" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="teacher-dashboard-032">
                  <div className="teacher-dashboard-011">
                    <div className="teacher-dashboard-033">5</div>
                  </div>
                  <div className="teacher-dashboard-007">
                    <div className="teacher-dashboard-009">
                      <div className="teacher-dashboard-040" />
                    </div>
                    <div className="teacher-dashboard-041">
                      <div className="teacher-dashboard-036">Active sections this<br/>semester</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="teacher-dashboard-026">
                <div className="teacher-dashboard-042" />
                <div className="teacher-dashboard-028">
                  <div className="teacher-dashboard-005">
                    <div className="teacher-dashboard-009">
                      <div className="teacher-dashboard-029">AVERAGE GRADE</div>
                    </div>
                    <div className="teacher-dashboard-030">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-043" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="teacher-dashboard-032">
                  <div className="teacher-dashboard-044">
                    <div className="teacher-dashboard-045">88.6%</div>
                    <div className="teacher-dashboard-046">(1.45 Eq.)</div>
                  </div>
                  <div className="teacher-dashboard-007">
                    <div className="teacher-dashboard-047">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-048" />
                      </div>
                      <div className="teacher-dashboard-049">+2.4%</div>
                    </div>
                    <div className="teacher-dashboard-050">
                      <div className="teacher-dashboard-036">vs previous term<br/>cohort</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="teacher-dashboard-026">
                <div className="teacher-dashboard-051" />
                <div className="teacher-dashboard-028">
                  <div className="teacher-dashboard-005">
                    <div className="teacher-dashboard-009">
                      <div className="teacher-dashboard-029">ATTENDANCE RATE</div>
                    </div>
                    <div className="teacher-dashboard-052">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-053" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="teacher-dashboard-032">
                  <div className="teacher-dashboard-011">
                    <div className="teacher-dashboard-033">96.8%</div>
                  </div>
                  <div className="teacher-dashboard-007">
                    <div className="teacher-dashboard-054" />
                    <div className="teacher-dashboard-055">
                      <div className="teacher-dashboard-036">Present rate across all<br/>classes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="teacher-dashboard-004">
            <div className="teacher-dashboard-056">
              <div className="teacher-dashboard-057">
                <div className="teacher-dashboard-011">
                  <div className="teacher-dashboard-058">
                    <div className="teacher-dashboard-005">
                      <div className="teacher-dashboard-059">
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-060">My Classes</div>
                        </div>
                        <div className="teacher-dashboard-061">
                          <div className="teacher-dashboard-062">5 Assigned</div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-063">
                        <div className="teacher-dashboard-016">
                          <div className="teacher-dashboard-064">Filter Roster</div>
                        </div>
                        <div className="teacher-dashboard-016">
                          <div className="teacher-dashboard-040" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="teacher-dashboard-056">
                    <div className="teacher-dashboard-065">
                      <div className="teacher-dashboard-066">
                        <div className="teacher-dashboard-067">
                          <div className="teacher-dashboard-068">
                            <div className="teacher-dashboard-062">CS 101</div>
                          </div>
                          <div className="teacher-dashboard-069">1st Year • BSCS</div>
                        </div>
                        <div className="teacher-dashboard-011">
                          <div className="teacher-dashboard-070">Introduction to Programming</div>
                        </div>
                        <div className="teacher-dashboard-071">
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-072" />
                            </div>
                            <div className="teacher-dashboard-036">38 Students</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-073" />
                            </div>
                            <div className="teacher-dashboard-036">Rm 402 • Science Lab</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-074">
                        <div className="teacher-dashboard-075">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-076">MWF 08:30 - 10:00</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-079" />
                              </div>
                            </div>
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-080" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="teacher-dashboard-065">
                      <div className="teacher-dashboard-066">
                        <div className="teacher-dashboard-081">
                          <div className="teacher-dashboard-082">
                            <div className="teacher-dashboard-083">CS 302</div>
                          </div>
                          <div className="teacher-dashboard-069">3rd Year • BSCS</div>
                        </div>
                        <div className="teacher-dashboard-011">
                          <div className="teacher-dashboard-070">Database Management Systems</div>
                        </div>
                        <div className="teacher-dashboard-071">
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-072" />
                            </div>
                            <div className="teacher-dashboard-036">42 Students</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-073" />
                            </div>
                            <div className="teacher-dashboard-036">Rm 508 • Tech Hub</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-074">
                        <div className="teacher-dashboard-075">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-076">TTH 10:30 - 12:00</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-079" />
                              </div>
                            </div>
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-080" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="teacher-dashboard-065">
                      <div className="teacher-dashboard-066">
                        <div className="teacher-dashboard-067">
                          <div className="teacher-dashboard-068">
                            <div className="teacher-dashboard-062">IT 204</div>
                          </div>
                          <div className="teacher-dashboard-069">2nd Year • BSIT</div>
                        </div>
                        <div className="teacher-dashboard-011">
                          <div className="teacher-dashboard-070">Web Systems &amp; Technologies</div>
                        </div>
                        <div className="teacher-dashboard-071">
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-072" />
                            </div>
                            <div className="teacher-dashboard-036">36 Students</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-073" />
                            </div>
                            <div className="teacher-dashboard-036">Rm 310 • Multimedia</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-074">
                        <div className="teacher-dashboard-075">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-076">MWF 13:00 - 14:30</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-079" />
                              </div>
                            </div>
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-080" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="teacher-dashboard-065">
                      <div className="teacher-dashboard-066">
                        <div className="teacher-dashboard-081">
                          <div className="teacher-dashboard-084">
                            <div className="teacher-dashboard-085">CS 401</div>
                          </div>
                          <div className="teacher-dashboard-069">4th Year • Senior Capstone</div>
                        </div>
                        <div className="teacher-dashboard-011">
                          <div className="teacher-dashboard-070">Software Engineering &amp; Arch</div>
                        </div>
                        <div className="teacher-dashboard-086">
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-072" />
                            </div>
                            <div className="teacher-dashboard-036">34 Students</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-073" />
                            </div>
                            <div className="teacher-dashboard-036">Rm 404 • Research Hall</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-074">
                        <div className="teacher-dashboard-075">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-076">TTH 14:00 - 15:30</div>
                          </div>
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-079" />
                              </div>
                            </div>
                            <div className="teacher-dashboard-077">
                              <div className="teacher-dashboard-078">
                                <div className="teacher-dashboard-080" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="teacher-dashboard-087">
                      <div className="teacher-dashboard-088">
                        <div className="teacher-dashboard-089">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-090" />
                          </div>
                        </div>
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-007">
                            <div className="teacher-dashboard-068">
                              <div className="teacher-dashboard-062">CS 210</div>
                            </div>
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-069">2nd Year • Section B</div>
                            </div>
                            <div className="teacher-dashboard-091">
                              <div className="teacher-dashboard-092" />
                            </div>
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-093">Today @ 16:00</div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-094">
                            <div className="teacher-dashboard-095">Data Structures &amp; Algorithm Analysis</div>
                          </div>
                          <div className="teacher-dashboard-011">
                            <div className="teacher-dashboard-036">34 Students enrolled • Computer Lab 3 • Practical<br/>assessment today</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-096">
                        <div className="teacher-dashboard-097">
                          <div className="teacher-dashboard-016">
                            <div className="teacher-dashboard-098" />
                          </div>
                          <div className="teacher-dashboard-016">
                            <div className="teacher-dashboard-099">Launch QR Attendance</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="teacher-dashboard-025">
                  <div className="teacher-dashboard-100">
                    <div className="teacher-dashboard-101">
                      <div className="teacher-dashboard-005">
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-011">
                            <div className="teacher-dashboard-102">Attendance Overview</div>
                          </div>
                          <div className="teacher-dashboard-011">
                            <div className="teacher-dashboard-036">Cumulative across 5 active<br/>sections</div>
                          </div>
                        </div>
                        <div className="teacher-dashboard-103">
                          <div className="teacher-dashboard-062">Sem Avg</div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-104">
                        <div className="teacher-dashboard-105">
                          <div className="teacher-dashboard-106" />
                          <div className="teacher-dashboard-107" />
                          <div className="teacher-dashboard-108" />
                          <div className="teacher-dashboard-109" />
                          <div className="teacher-dashboard-110">
                            <div className="teacher-dashboard-111">
                              <div className="teacher-dashboard-112">96.8%</div>
                            </div>
                            <div className="teacher-dashboard-111">
                              <div className="teacher-dashboard-113">Present</div>
                            </div>
                          </div>
                        </div>
                        <div className="teacher-dashboard-114">
                          <div className="teacher-dashboard-115">
                            <div className="teacher-dashboard-059">
                              <div className="teacher-dashboard-116" />
                              <div className="teacher-dashboard-009">
                                <div className="teacher-dashboard-117">Present</div>
                              </div>
                            </div>
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-247">96.8%<br/></span><span className="teacher-dashboard-248">(178)</span></div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-115">
                            <div className="teacher-dashboard-059">
                              <div className="teacher-dashboard-119" />
                              <div className="teacher-dashboard-009">
                                <div className="teacher-dashboard-117">Late</div>
                              </div>
                            </div>
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-247">1.8% </span><span className="teacher-dashboard-248">(3)</span></div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-115">
                            <div className="teacher-dashboard-059">
                              <div className="teacher-dashboard-120" />
                              <div className="teacher-dashboard-009">
                                <div className="teacher-dashboard-117">Excused</div>
                              </div>
                            </div>
                            <div className="teacher-dashboard-121">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-247">0.9%<br/></span><span className="teacher-dashboard-248">(2)</span></div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-115">
                            <div className="teacher-dashboard-059">
                              <div className="teacher-dashboard-122" />
                              <div className="teacher-dashboard-009">
                                <div className="teacher-dashboard-117">Absent</div>
                              </div>
                            </div>
                            <div className="teacher-dashboard-123">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-247">0.5%<br/></span><span className="teacher-dashboard-248">(1)</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="teacher-dashboard-124">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-069">Last synchronized: 2 hours ago</div>
                      </div>
                      <div className="teacher-dashboard-125">
                        <div className="teacher-dashboard-126">Full Report</div>
                      </div>
                    </div>
                  </div>
                  <div className="teacher-dashboard-100">
                    <div className="teacher-dashboard-101">
                      <div className="teacher-dashboard-005">
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-011">
                            <div className="teacher-dashboard-102">Grade Performance</div>
                          </div>
                          <div className="teacher-dashboard-011">
                            <div className="teacher-dashboard-036">Midterm standing distribution</div>
                          </div>
                        </div>
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-127" />
                        </div>
                      </div>
                      <div className="teacher-dashboard-128">
                        <div className="teacher-dashboard-032">
                          <div className="teacher-dashboard-005">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-249">95–100 </span><span className="teacher-dashboard-250">(Superior)</span></div>
                            </div>
                            <div className="teacher-dashboard-129">
                              <div className="teacher-dashboard-130">52 </div>
                              <div className="teacher-dashboard-131">(28.2%)</div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-132">
                            <div className="teacher-dashboard-133" />
                          </div>
                        </div>
                        <div className="teacher-dashboard-032">
                          <div className="teacher-dashboard-134">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-249">90–94 </span><span className="teacher-dashboard-250">(Very Good)</span></div>
                            </div>
                            <div className="teacher-dashboard-129">
                              <div className="teacher-dashboard-130">74 </div>
                              <div className="teacher-dashboard-131">(40.2%)</div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-132">
                            <div className="teacher-dashboard-135" />
                          </div>
                        </div>
                        <div className="teacher-dashboard-032">
                          <div className="teacher-dashboard-005">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-249">85–89 </span><span className="teacher-dashboard-250">(Good)</span></div>
                            </div>
                            <div className="teacher-dashboard-136">
                              <div className="teacher-dashboard-130">41 </div>
                              <div className="teacher-dashboard-131">(22.3%)</div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-132">
                            <div className="teacher-dashboard-137" />
                          </div>
                        </div>
                        <div className="teacher-dashboard-032">
                          <div className="teacher-dashboard-005">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-249">80–84 </span><span className="teacher-dashboard-250">(Satisfactory)</span></div>
                            </div>
                            <div className="teacher-dashboard-136">
                              <div className="teacher-dashboard-130">14 </div>
                              <div className="teacher-dashboard-131">(7.6%)</div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-132">
                            <div className="teacher-dashboard-138" />
                          </div>
                        </div>
                        <div className="teacher-dashboard-032">
                          <div className="teacher-dashboard-134">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-118"><span className="teacher-dashboard-249">Below 80 </span><span className="teacher-dashboard-250">(Conditional)</span></div>
                            </div>
                            <div className="teacher-dashboard-129">
                              <div className="teacher-dashboard-139">3 </div>
                              <div className="teacher-dashboard-131">(1.6%)</div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-132">
                            <div className="teacher-dashboard-140" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="teacher-dashboard-141">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-069">Overall Class Median: 91.2%</div>
                      </div>
                      <div className="teacher-dashboard-125">
                        <div className="teacher-dashboard-126">Grade Sheet</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="teacher-dashboard-142">
                <div className="teacher-dashboard-143">
                  <div className="teacher-dashboard-058">
                    <div className="teacher-dashboard-134">
                      <div className="teacher-dashboard-059">
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-144" />
                        </div>
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-102">Upcoming Schedule</div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-145">
                        <div className="teacher-dashboard-146">Today</div>
                      </div>
                    </div>
                  </div>
                  <div className="teacher-dashboard-147">
                    <div className="teacher-dashboard-148">
                      <div className="teacher-dashboard-149">
                        <div className="teacher-dashboard-150">
                          <div className="teacher-dashboard-151">13</div>
                        </div>
                        <div className="teacher-dashboard-150">
                          <div className="teacher-dashboard-152">00</div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-153">
                        <div className="teacher-dashboard-134">
                          <div className="teacher-dashboard-154">
                            <div className="teacher-dashboard-155">IT 204 Lecture</div>
                          </div>
                          <div className="teacher-dashboard-156">
                            <div className="teacher-dashboard-157">In 45m</div>
                          </div>
                        </div>
                        <div className="teacher-dashboard-158">
                          <div className="teacher-dashboard-159">Full-stack React &amp; State Mgmt</div>
                        </div>
                        <div className="teacher-dashboard-160">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-161" />
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">Rm 310 • Multi-Lab</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="teacher-dashboard-148">
                      <div className="teacher-dashboard-162">
                        <div className="teacher-dashboard-150">
                          <div className="teacher-dashboard-151">16</div>
                        </div>
                        <div className="teacher-dashboard-150">
                          <div className="teacher-dashboard-152">00</div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-153">
                        <div className="teacher-dashboard-005">
                          <div className="teacher-dashboard-154">
                            <div className="teacher-dashboard-155">CS 210 Practical</div>
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">Scheduled</div>
                          </div>
                        </div>
                        <div className="teacher-dashboard-158">
                          <div className="teacher-dashboard-159">Graph Algorithms Speed Evaluation</div>
                        </div>
                        <div className="teacher-dashboard-160">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-161" />
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">Lab 3 • Terminal Room</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="teacher-dashboard-163">
                    <div className="teacher-dashboard-164">
                      <div className="teacher-dashboard-134">
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-165">INSTITUTIONAL DEADLINES</div>
                        </div>
                        <div className="teacher-dashboard-009">
                          <div className="teacher-dashboard-093">Registrar</div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-032">
                        <div className="teacher-dashboard-166">
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-167" />
                            </div>
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-011">
                                <div className="teacher-dashboard-168">Midterm Grade Encoding<br/>Deadline</div>
                              </div>
                              <div className="teacher-dashboard-011">
                                <div className="teacher-dashboard-169">Portal closes Friday, 11:59<br/>PM</div>
                              </div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-170">
                            <div className="teacher-dashboard-171">3 Days<br/>Left</div>
                          </div>
                        </div>
                        <div className="teacher-dashboard-172">
                          <div className="teacher-dashboard-059">
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-173" />
                            </div>
                            <div className="teacher-dashboard-009">
                              <div className="teacher-dashboard-011">
                                <div className="teacher-dashboard-168">Curriculum Syllabus Review</div>
                              </div>
                              <div className="teacher-dashboard-011">
                                <div className="teacher-dashboard-169">Dean&apos;s Academic Council<br/>Approval</div>
                              </div>
                            </div>
                          </div>
                          <div className="teacher-dashboard-174">
                            <div className="teacher-dashboard-046">May<br/>12</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="teacher-dashboard-175">
                  <div className="teacher-dashboard-176">
                    <div className="teacher-dashboard-005">
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-102">Recent Activities</div>
                      </div>
                      <div className="teacher-dashboard-009">
                        <div className="teacher-dashboard-177" />
                      </div>
                    </div>
                  </div>
                  <div className="teacher-dashboard-178">
                    <div className="teacher-dashboard-179">
                      <div className="teacher-dashboard-180">View Complete Audit Log</div>
                    </div>
                  </div>
                  <div className="teacher-dashboard-181">
                    <div className="teacher-dashboard-182" />
                    <div className="teacher-dashboard-183">
                      <div className="teacher-dashboard-006">
                        <div className="teacher-dashboard-011">
                          <div className="teacher-dashboard-118"><span className="teacher-dashboard-251">Encoded Quiz 3 Grades for </span><span className="teacher-dashboard-252">CS 101</span><span className="teacher-dashboard-251"> (38<br/>Records)</span></div>
                        </div>
                        <div className="teacher-dashboard-184">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">24 mins ago</div>
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">•</div>
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-093">Avg: 87.4%</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-185">
                        <div className="teacher-dashboard-186" />
                      </div>
                    </div>
                    <div className="teacher-dashboard-183">
                      <div className="teacher-dashboard-006">
                        <div className="teacher-dashboard-187">
                          <div className="teacher-dashboard-188">Updated Attendance Registry for </div>
                          <div className="teacher-dashboard-189">
                            <div className="teacher-dashboard-190">CS 302</div>
                            <div className="teacher-dashboard-191">- Database Systems</div>
                          </div>
                        </div>
                        <div className="teacher-dashboard-184">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">2 hours ago</div>
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">•</div>
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-192">41 Present, 1 Excused</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-193">
                        <div className="teacher-dashboard-186" />
                      </div>
                    </div>
                    <div className="teacher-dashboard-183">
                      <div className="teacher-dashboard-006">
                        <div className="teacher-dashboard-011">
                          <div className="teacher-dashboard-118"><span className="teacher-dashboard-251">Submitted Lab Project Assessment<br/>Remarks for </span><span className="teacher-dashboard-252">CS 401</span></div>
                        </div>
                        <div className="teacher-dashboard-184">
                          <div className="teacher-dashboard-194">
                            <div className="teacher-dashboard-069">Yesterday at 5:15<br/>PM</div>
                          </div>
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">•</div>
                          </div>
                          <div className="teacher-dashboard-195">
                            <div className="teacher-dashboard-069">8 Teams<br/>Reviewed</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-196">
                        <div className="teacher-dashboard-186" />
                      </div>
                    </div>
                    <div className="teacher-dashboard-183">
                      <div className="teacher-dashboard-006">
                        <div className="teacher-dashboard-011">
                          <div className="teacher-dashboard-118"><span className="teacher-dashboard-251">Uploaded Solution Manual &amp; Rubrics for<br/></span><span className="teacher-dashboard-252">IT 204 Midterm Exam</span></div>
                        </div>
                        <div className="teacher-dashboard-197">
                          <div className="teacher-dashboard-009">
                            <div className="teacher-dashboard-069">May 3, 2026</div>
                          </div>
                        </div>
                      </div>
                      <div className="teacher-dashboard-198">
                        <div className="teacher-dashboard-186" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="teacher-dashboard-199">
        <div className="teacher-dashboard-200">
          <div className="teacher-dashboard-201">
            <div className="teacher-dashboard-202">
              <div className="teacher-dashboard-203">Search students, classes, or records...</div>
            </div>
          </div>
          <div className="teacher-dashboard-204">
            <div className="teacher-dashboard-205" />
          </div>
        </div>
        <div className="teacher-dashboard-206">
          <div className="teacher-dashboard-207">
            <div className="teacher-dashboard-008" />
            <div className="teacher-dashboard-009">
              <div className="teacher-dashboard-192">AY 2025–2026 • 2nd Semester</div>
            </div>
          </div>
          <div className="teacher-dashboard-208">
            <div className="teacher-dashboard-078">
              <div className="teacher-dashboard-209" />
            </div>
            <div className="teacher-dashboard-210" />
          </div>
          <div className="teacher-dashboard-211">
            <div className="teacher-dashboard-212">
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-213" />
              </div>
            </div>
            <div className="teacher-dashboard-009">
              <div className="teacher-dashboard-011">
                <div className="teacher-dashboard-214">Prof. Eleanor Vance</div>
              </div>
              <div className="teacher-dashboard-011">
                <div className="teacher-dashboard-169">Dept. of Computer Science</div>
              </div>
            </div>
            <div className="teacher-dashboard-009">
              <div className="teacher-dashboard-215" />
            </div>
          </div>
        </div>
      </div>
      <div className="teacher-dashboard-216">
        <div className="teacher-dashboard-217">
          <div className="teacher-dashboard-218">
            <div className="teacher-dashboard-219">
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-220" />
              </div>
            </div>
            <div className="teacher-dashboard-221">
              <div className="teacher-dashboard-222">
                <div className="teacher-dashboard-223">TMS</div>
              </div>
              <div className="teacher-dashboard-224">
                <div className="teacher-dashboard-192">Teacher Portal</div>
              </div>
            </div>
          </div>
          <div className="teacher-dashboard-225">
            <div className="teacher-dashboard-226">ACADEMIC OPERATIONS</div>
          </div>
          <div className="teacher-dashboard-227">
            <div className="teacher-dashboard-228">
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-229" />
              </div>
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-230">Dashboard</div>
              </div>
            </div>
            <div className="teacher-dashboard-231">
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-232" />
              </div>
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-233">Class Roster</div>
              </div>
            </div>
            <div className="teacher-dashboard-231">
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-234" />
              </div>
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-233">Grade Encode</div>
              </div>
            </div>
            <div className="teacher-dashboard-231">
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-235" />
              </div>
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-233">Attendance Tracker</div>
              </div>
            </div>
            <div className="teacher-dashboard-231">
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-236" />
              </div>
              <div className="teacher-dashboard-009">
                <div className="teacher-dashboard-233">Settings</div>
              </div>
            </div>
          </div>
        </div>
        <div className="teacher-dashboard-237">
          <div className="teacher-dashboard-238">
            <div className="teacher-dashboard-239">
              <div className="teacher-dashboard-240">
                <div className="teacher-dashboard-009">
                  <div className="teacher-dashboard-213" />
                </div>
              </div>
              <div className="teacher-dashboard-241">
                <div className="teacher-dashboard-242" />
              </div>
            </div>
            <div className="teacher-dashboard-153">
              <div className="teacher-dashboard-158">
                <div className="teacher-dashboard-243">Faculty On Duty</div>
              </div>
              <div className="teacher-dashboard-158">
                <div className="teacher-dashboard-244">In Session • Rm 402</div>
              </div>
            </div>
          </div>
          <div className="teacher-dashboard-231">
            <div className="teacher-dashboard-009">
              <div className="teacher-dashboard-245" />
            </div>
            <div className="teacher-dashboard-009">
              <div className="teacher-dashboard-246">Logout</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
