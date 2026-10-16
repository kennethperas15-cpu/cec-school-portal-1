import './StudentDashboard.css';
import type { UserAuthData } from '../auth/Login';

interface StudentDashboardProps {
  currentUser: UserAuthData;
  onNotify: (message: string) => void;
  onLogout: () => void;
}

export function StudentDashboard(_props: StudentDashboardProps) {
  return (
    <div className="student-dashboard-001">
      <div className="student-dashboard-002">
        <div className="student-dashboard-003">
          <div className="student-dashboard-004">
            <div className="student-dashboard-005" />
            <div className="student-dashboard-006" />
            <div className="student-dashboard-007">
              <div className="student-dashboard-008">
                <div className="student-dashboard-009">
                  <div className="student-dashboard-010">
                    <div className="student-dashboard-011" />
                    <div className="student-dashboard-012">BS Computer Science • Year 3 - Section A</div>
                  </div>
                  <div className="student-dashboard-013">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-015" />
                    </div>
                    <div className="student-dashboard-016">Dean&apos;s Honor List • AY 2025–2026</div>
                  </div>
                </div>
                <div className="student-dashboard-017">
                  <div className="student-dashboard-018">
                    <div className="student-dashboard-019">Welcome back, Alex!</div>
                  </div>
                </div>
                <div className="student-dashboard-020">
                  <div className="student-dashboard-021">Here is your real-time academic overview for today. You have </div>
                  <div className="student-dashboard-022">3 lectures</div>
                  <div className="student-dashboard-023">scheduled</div>
                  <div className="student-dashboard-024"> and your current semester trajectory remains on the High</div>
                  <div className="student-dashboard-025">Distinction honor band.</div>
                </div>
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-026">
                  <div className="student-dashboard-027">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-028" />
                    </div>
                    <div className="student-dashboard-029">Class Schedule</div>
                  </div>
                  <div className="student-dashboard-027">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-030" />
                    </div>
                    <div className="student-dashboard-029">View Grades</div>
                  </div>
                  <div className="student-dashboard-031">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-032" />
                    </div>
                    <div className="student-dashboard-033">Check Attendance</div>
                  </div>
                  <div className="student-dashboard-031">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-034" />
                    </div>
                    <div className="student-dashboard-033">Enrolled Courses</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="student-dashboard-035">
            <div className="student-dashboard-036">
              <div className="student-dashboard-007">
                <div className="student-dashboard-037">
                  <div className="student-dashboard-038">ENROLLED<br/>COURSES</div>
                </div>
                <div className="student-dashboard-039">
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-040" />
                  </div>
                </div>
              </div>
              <div className="student-dashboard-041">
                <div className="student-dashboard-042">
                  <div className="student-dashboard-043">6 Active</div>
                  <div className="student-dashboard-044">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-045">20.0</div>
                    </div>
                    <div className="student-dashboard-046">Academic Units</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="student-dashboard-047">
              <div className="student-dashboard-007">
                <div className="student-dashboard-048">
                  <div className="student-dashboard-038">CURRENT<br/>CUMULATIVE GPA</div>
                </div>
                <div className="student-dashboard-049">
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-050" />
                  </div>
                </div>
              </div>
              <div className="student-dashboard-041">
                <div className="student-dashboard-051">
                  <div className="student-dashboard-052">
                    <div className="student-dashboard-053">3.84</div>
                    <div className="student-dashboard-054">/ 4.00</div>
                  </div>
                  <div className="student-dashboard-055">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-056" />
                    </div>
                    <div className="student-dashboard-057">
                      <div className="student-dashboard-058">+0.08 • Top 5%<br/>Rank</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="student-dashboard-047">
              <div className="student-dashboard-007">
                <div className="student-dashboard-059">
                  <div className="student-dashboard-038">ATTENDANCE<br/>RATE</div>
                </div>
                <div className="student-dashboard-060">
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-061" />
                  </div>
                </div>
              </div>
              <div className="student-dashboard-041">
                <div className="student-dashboard-062">
                  <div className="student-dashboard-053">96.4%</div>
                  <div className="student-dashboard-044">
                    <div className="student-dashboard-063" />
                    <div className="student-dashboard-064">
                      <div className="student-dashboard-065">0 Unexcused •<br/>Optimal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="student-dashboard-036">
              <div className="student-dashboard-066">
                <div className="student-dashboard-014">
                  <div className="student-dashboard-038">CLASSES TODAY</div>
                </div>
                <div className="student-dashboard-067">
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-068" />
                  </div>
                </div>
              </div>
              <div className="student-dashboard-041">
                <div className="student-dashboard-062">
                  <div className="student-dashboard-053">3 Lectures</div>
                  <div className="student-dashboard-069">
                    <div className="student-dashboard-070"><span className="student-dashboard-279">CS 302</span><span className="student-dashboard-280"> in 20m (Hall 304)</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="student-dashboard-071">
              <div className="student-dashboard-007">
                <div className="student-dashboard-014">
                  <div className="student-dashboard-038">PENDING TASKS</div>
                </div>
                <div className="student-dashboard-067">
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-072" />
                  </div>
                </div>
              </div>
              <div className="student-dashboard-041">
                <div className="student-dashboard-062">
                  <div className="student-dashboard-053">4 Tasks</div>
                  <div className="student-dashboard-073">
                    <div className="student-dashboard-074">
                      <div className="student-dashboard-075">2 Labs • 1 Quiz • 1<br/>Project</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="student-dashboard-026">
            <div className="student-dashboard-076">
              <div className="student-dashboard-077">
                <div className="student-dashboard-007">
                  <div className="student-dashboard-078">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-079" />
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-080">Today&apos;s Academic Schedule</div>
                    </div>
                  </div>
                  <div className="student-dashboard-081">
                    <div className="student-dashboard-065">Wednesday, March 4</div>
                  </div>
                </div>
                <div className="student-dashboard-082">
                  <div className="student-dashboard-083">
                    <div className="student-dashboard-084">
                      <div className="student-dashboard-085">
                        <div className="student-dashboard-086">
                          <div className="student-dashboard-087">
                            <div className="student-dashboard-088">09:00 AM</div>
                          </div>
                          <div className="student-dashboard-087">
                            <div className="student-dashboard-089">10:20 AM</div>
                          </div>
                        </div>
                        <div className="student-dashboard-090" />
                        <div className="student-dashboard-014">
                          <div className="student-dashboard-091">
                            <div className="student-dashboard-014">
                              <div className="student-dashboard-092">CS 301 • Systems Programming</div>
                            </div>
                            <div className="student-dashboard-093">
                              <div className="student-dashboard-065">Sec A</div>
                            </div>
                          </div>
                          <div className="student-dashboard-017">
                            <div className="student-dashboard-094">
                              <div className="student-dashboard-078">
                                <div className="student-dashboard-014">
                                  <div className="student-dashboard-095" />
                                </div>
                                <div className="student-dashboard-096">Tech Hall 301</div>
                              </div>
                              <div className="student-dashboard-078">
                                <div className="student-dashboard-014">
                                  <div className="student-dashboard-097" />
                                </div>
                                <div className="student-dashboard-096">Prof. Alan Turing</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="student-dashboard-098">
                        <div className="student-dashboard-014">
                          <div className="student-dashboard-099" />
                        </div>
                        <div className="student-dashboard-065">Completed</div>
                      </div>
                    </div>
                    <div className="student-dashboard-100">
                      <div className="student-dashboard-101" />
                      <div className="student-dashboard-085">
                        <div className="student-dashboard-086">
                          <div className="student-dashboard-087">
                            <div className="student-dashboard-102">10:30 AM</div>
                          </div>
                          <div className="student-dashboard-087">
                            <div className="student-dashboard-103">12:00 PM</div>
                          </div>
                        </div>
                        <div className="student-dashboard-104" />
                        <div className="student-dashboard-014">
                          <div className="student-dashboard-091">
                            <div className="student-dashboard-014">
                              <div className="student-dashboard-105">CS 302 • Database Architecture</div>
                            </div>
                            <div className="student-dashboard-106">
                              <div className="student-dashboard-012">Sec A</div>
                            </div>
                          </div>
                          <div className="student-dashboard-017">
                            <div className="student-dashboard-094">
                              <div className="student-dashboard-078">
                                <div className="student-dashboard-014">
                                  <div className="student-dashboard-107" />
                                </div>
                                <div className="student-dashboard-108">Tech Hall 304</div>
                              </div>
                              <div className="student-dashboard-078">
                                <div className="student-dashboard-014">
                                  <div className="student-dashboard-109" />
                                </div>
                                <div className="student-dashboard-108">Dr. Eleanor Vance</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="student-dashboard-110">
                        <div className="student-dashboard-014">
                          <div className="student-dashboard-111" />
                        </div>
                        <div className="student-dashboard-112">Starting in 20m</div>
                      </div>
                    </div>
                    <div className="student-dashboard-113">
                      <div className="student-dashboard-085">
                        <div className="student-dashboard-086">
                          <div className="student-dashboard-087">
                            <div className="student-dashboard-088">02:00 PM</div>
                          </div>
                          <div className="student-dashboard-087">
                            <div className="student-dashboard-089">03:30 PM</div>
                          </div>
                        </div>
                        <div className="student-dashboard-114" />
                        <div className="student-dashboard-014">
                          <div className="student-dashboard-091">
                            <div className="student-dashboard-115">
                              <div className="student-dashboard-092">CS 305 • Software Engineering &amp;<br/>Design</div>
                            </div>
                            <div className="student-dashboard-116">
                              <div className="student-dashboard-065">Sec<br/>B</div>
                            </div>
                          </div>
                          <div className="student-dashboard-017">
                            <div className="student-dashboard-094">
                              <div className="student-dashboard-078">
                                <div className="student-dashboard-014">
                                  <div className="student-dashboard-117" />
                                </div>
                                <div className="student-dashboard-096">Innovation Lab B</div>
                              </div>
                              <div className="student-dashboard-078">
                                <div className="student-dashboard-014">
                                  <div className="student-dashboard-097" />
                                </div>
                                <div className="student-dashboard-096">Prof. Marcus Brody</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="student-dashboard-118">
                        <div className="student-dashboard-014">
                          <div className="student-dashboard-099" />
                        </div>
                        <div className="student-dashboard-065">Upcoming</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="student-dashboard-077">
                <div className="student-dashboard-007">
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-018">
                      <div className="student-dashboard-080">Academic Performance Benchmark</div>
                    </div>
                    <div className="student-dashboard-018">
                      <div className="student-dashboard-096">Continuous course grade assessments against course cohort<br/>averages</div>
                    </div>
                  </div>
                  <div className="student-dashboard-119">
                    <div className="student-dashboard-120">
                      <div className="student-dashboard-121" />
                      <div className="student-dashboard-065">Alex&apos;s<br/>Score</div>
                    </div>
                    <div className="student-dashboard-122">
                      <div className="student-dashboard-123" />
                      <div className="student-dashboard-054">Class<br/>Median</div>
                    </div>
                  </div>
                </div>
                <div className="student-dashboard-124">
                  <div className="student-dashboard-125">
                    <div className="student-dashboard-126">
                      <div className="student-dashboard-127">100%</div>
                    </div>
                    <div className="student-dashboard-128">
                      <div className="student-dashboard-129">90%</div>
                    </div>
                    <div className="student-dashboard-130">
                      <div className="student-dashboard-131">80%</div>
                    </div>
                    <div className="student-dashboard-132">
                      <div className="student-dashboard-133">70%</div>
                    </div>
                    <div className="student-dashboard-134" />
                    <div className="student-dashboard-135" />
                    <div className="student-dashboard-136">
                      <div className="student-dashboard-137">CS 301</div>
                    </div>
                    <div className="student-dashboard-138">
                      <div className="student-dashboard-139">94%</div>
                    </div>
                    <div className="student-dashboard-140" />
                    <div className="student-dashboard-141" />
                    <div className="student-dashboard-142">
                      <div className="student-dashboard-137">CS 302</div>
                    </div>
                    <div className="student-dashboard-143">
                      <div className="student-dashboard-144">96%</div>
                    </div>
                    <div className="student-dashboard-145" />
                    <div className="student-dashboard-146" />
                    <div className="student-dashboard-147">
                      <div className="student-dashboard-137">CS 305</div>
                    </div>
                    <div className="student-dashboard-148">
                      <div className="student-dashboard-149">91%</div>
                    </div>
                    <div className="student-dashboard-150" />
                    <div className="student-dashboard-151" />
                    <div className="student-dashboard-152">
                      <div className="student-dashboard-153">MATH 220</div>
                    </div>
                    <div className="student-dashboard-154">
                      <div className="student-dashboard-155">88%</div>
                    </div>
                    <div className="student-dashboard-156" />
                    <div className="student-dashboard-157" />
                    <div className="student-dashboard-158">
                      <div className="student-dashboard-137">CS 310</div>
                    </div>
                    <div className="student-dashboard-159">
                      <div className="student-dashboard-160">95%</div>
                    </div>
                    <div className="student-dashboard-161" />
                    <div className="student-dashboard-162" />
                    <div className="student-dashboard-163">
                      <div className="student-dashboard-164">ENG 205</div>
                    </div>
                    <div className="student-dashboard-165">
                      <div className="student-dashboard-166">90%</div>
                    </div>
                    <div className="student-dashboard-167" />
                    <div className="student-dashboard-168" />
                    <div className="student-dashboard-169" />
                    <div className="student-dashboard-170" />
                    <div className="student-dashboard-171" />
                    <div className="student-dashboard-172" />
                    <div className="student-dashboard-173" />
                  </div>
                </div>
                <div className="student-dashboard-174">
                  <div className="student-dashboard-175">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-176" />
                    </div>
                    <div className="student-dashboard-096">Overall Term Standing:</div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-177">Summa Cum Laude Track</div>
                    </div>
                  </div>
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-096">Overall Composite: 92.3%</div>
                  </div>
                </div>
              </div>
              <div className="student-dashboard-077">
                <div className="student-dashboard-007">
                  <div className="student-dashboard-078">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-178" />
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-080">Current Semester Course Load</div>
                    </div>
                  </div>
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-054">6 Total Enrolled Courses</div>
                  </div>
                </div>
                <div className="student-dashboard-026">
                  <div className="student-dashboard-179">
                    <div className="student-dashboard-180">
                      <div className="student-dashboard-181">
                        <div className="student-dashboard-182">CS 301</div>
                        <div className="student-dashboard-092">Systems Programming</div>
                        <div className="student-dashboard-096">Prof. Alan Turing • Sec A</div>
                      </div>
                      <div className="student-dashboard-183">
                        <div className="student-dashboard-184">94% (A)</div>
                      </div>
                    </div>
                    <div className="student-dashboard-185">
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">3.5 Academic Units</div>
                      </div>
                      <div className="student-dashboard-078">
                        <div className="student-dashboard-186" />
                        <div className="student-dashboard-065">Lecture &amp; Lab</div>
                      </div>
                    </div>
                  </div>
                  <div className="student-dashboard-179">
                    <div className="student-dashboard-180">
                      <div className="student-dashboard-181">
                        <div className="student-dashboard-182">CS 302</div>
                        <div className="student-dashboard-187">
                          <div className="student-dashboard-092">Database Architecture</div>
                        </div>
                        <div className="student-dashboard-096">Dr. Eleanor Vance • Sec A</div>
                      </div>
                      <div className="student-dashboard-183">
                        <div className="student-dashboard-184">96% (A+)</div>
                      </div>
                    </div>
                    <div className="student-dashboard-188">
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">3.5 Academic Units</div>
                      </div>
                      <div className="student-dashboard-078">
                        <div className="student-dashboard-186" />
                        <div className="student-dashboard-065">Lecture &amp; Studio</div>
                      </div>
                    </div>
                  </div>
                  <div className="student-dashboard-189">
                    <div className="student-dashboard-180">
                      <div className="student-dashboard-181">
                        <div className="student-dashboard-182">CS 305</div>
                        <div className="student-dashboard-187">
                          <div className="student-dashboard-092">Software Eng. &amp; Design</div>
                        </div>
                        <div className="student-dashboard-096">Prof. Marcus Brody • Sec B</div>
                      </div>
                      <div className="student-dashboard-183">
                        <div className="student-dashboard-184">91% (A-)</div>
                      </div>
                    </div>
                    <div className="student-dashboard-188">
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">4.0 Academic Units</div>
                      </div>
                      <div className="student-dashboard-078">
                        <div className="student-dashboard-186" />
                        <div className="student-dashboard-065">Capstone Track</div>
                      </div>
                    </div>
                  </div>
                  <div className="student-dashboard-179">
                    <div className="student-dashboard-190">
                      <div className="student-dashboard-191">
                        <div className="student-dashboard-182">MATH 220</div>
                        <div className="student-dashboard-092">Linear Algebra &amp;<br/>Matrices</div>
                        <div className="student-dashboard-096">Dr. Sarah Chen • Sec C</div>
                      </div>
                      <div className="student-dashboard-192">
                        <div className="student-dashboard-184">88%<br/>(B+)</div>
                      </div>
                    </div>
                    <div className="student-dashboard-185">
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">3.0 Academic Units</div>
                      </div>
                      <div className="student-dashboard-078">
                        <div className="student-dashboard-186" />
                        <div className="student-dashboard-065">Lecture Only</div>
                      </div>
                    </div>
                  </div>
                  <div className="student-dashboard-179">
                    <div className="student-dashboard-180">
                      <div className="student-dashboard-193">
                        <div className="student-dashboard-182">CS 310</div>
                        <div className="student-dashboard-092">Computer Networks &amp;<br/>Sec</div>
                        <div className="student-dashboard-096">Prof. David Ross • Sec A</div>
                      </div>
                      <div className="student-dashboard-194">
                        <div className="student-dashboard-184">95%<br/>(A)</div>
                      </div>
                    </div>
                    <div className="student-dashboard-185">
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">3.0 Academic Units</div>
                      </div>
                      <div className="student-dashboard-078">
                        <div className="student-dashboard-186" />
                        <div className="student-dashboard-065">Lab Oriented</div>
                      </div>
                    </div>
                  </div>
                  <div className="student-dashboard-179">
                    <div className="student-dashboard-180">
                      <div className="student-dashboard-195">
                        <div className="student-dashboard-182">ENG 205</div>
                        <div className="student-dashboard-092">Technical Writing for<br/>Eng</div>
                        <div className="student-dashboard-096">Dr. Linda Martinez • Sec D</div>
                      </div>
                      <div className="student-dashboard-196">
                        <div className="student-dashboard-184">90%<br/>(A-)</div>
                      </div>
                    </div>
                    <div className="student-dashboard-188">
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">3.0 Academic Units</div>
                      </div>
                      <div className="student-dashboard-078">
                        <div className="student-dashboard-186" />
                        <div className="student-dashboard-065">Seminar</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="student-dashboard-076">
              <div className="student-dashboard-077">
                <div className="student-dashboard-007">
                  <div className="student-dashboard-197">
                    <div className="student-dashboard-080">Attendance<br/>Audit</div>
                  </div>
                  <div className="student-dashboard-198">
                    <div className="student-dashboard-065">85 Total<br/>Sessions</div>
                  </div>
                </div>
                <div className="student-dashboard-199">
                  <div className="student-dashboard-200">
                    <div className="student-dashboard-201" />
                    <div className="student-dashboard-202" />
                    <div className="student-dashboard-203" />
                    <div className="student-dashboard-204">
                      <div className="student-dashboard-087">
                        <div className="student-dashboard-205">96.4%</div>
                      </div>
                      <div className="student-dashboard-087">
                        <div className="student-dashboard-206">PRESENT</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="student-dashboard-207">
                  <div className="student-dashboard-208">
                    <div className="student-dashboard-209">
                      <div className="student-dashboard-210" />
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-211">Present</div>
                      </div>
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-212">82 sessions (96.4%)</div>
                    </div>
                  </div>
                  <div className="student-dashboard-208">
                    <div className="student-dashboard-209">
                      <div className="student-dashboard-213" />
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-211">Late Arrivals</div>
                      </div>
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-212">2 sessions (2.4%)</div>
                    </div>
                  </div>
                  <div className="student-dashboard-208">
                    <div className="student-dashboard-209">
                      <div className="student-dashboard-214" />
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-211">Excused Leave</div>
                      </div>
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-212">1 session (1.2%)</div>
                    </div>
                  </div>
                  <div className="student-dashboard-208">
                    <div className="student-dashboard-209">
                      <div className="student-dashboard-215" />
                      <div className="student-dashboard-216">
                        <div className="student-dashboard-211">Unexcused<br/>Absences</div>
                      </div>
                    </div>
                    <div className="student-dashboard-217">
                      <div className="student-dashboard-218">0 sessions<br/>(0.0%)</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="student-dashboard-077">
                <div className="student-dashboard-007">
                  <div className="student-dashboard-209">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-219" />
                    </div>
                    <div className="student-dashboard-220">
                      <div className="student-dashboard-080">University<br/>Bulletins</div>
                    </div>
                  </div>
                  <div className="student-dashboard-221">
                    <div className="student-dashboard-222">All<br/>notices</div>
                  </div>
                </div>
                <div className="student-dashboard-083">
                  <div className="student-dashboard-223">
                    <div className="student-dashboard-007">
                      <div className="student-dashboard-224">
                        <div className="student-dashboard-225">Academic Affairs</div>
                      </div>
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">2 hours ago</div>
                      </div>
                    </div>
                    <div className="student-dashboard-018">
                      <div className="student-dashboard-226">Midterm Examination<br/>Timetable Published</div>
                    </div>
                    <div className="student-dashboard-069">
                      <div className="student-dashboard-075">The Office of the Dean has finalized<br/>the schedule for Midterm Exams for</div>
                    </div>
                  </div>
                  <div className="student-dashboard-223">
                    <div className="student-dashboard-007">
                      <div className="student-dashboard-224">
                        <div className="student-dashboard-058">Department</div>
                      </div>
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">Yesterday</div>
                      </div>
                    </div>
                    <div className="student-dashboard-018">
                      <div className="student-dashboard-226">ACM Hackathon 2026<br/>Registration Open</div>
                    </div>
                    <div className="student-dashboard-069">
                      <div className="student-dashboard-075">Compete in 36-hour algorithmic<br/>challenges with corporate mentors</div>
                    </div>
                  </div>
                  <div className="student-dashboard-223">
                    <div className="student-dashboard-007">
                      <div className="student-dashboard-224">
                        <div className="student-dashboard-065">Facilities</div>
                      </div>
                      <div className="student-dashboard-014">
                        <div className="student-dashboard-054">3 days ago</div>
                      </div>
                    </div>
                    <div className="student-dashboard-018">
                      <div className="student-dashboard-226">Library Extended Hours for<br/>Midterms</div>
                    </div>
                    <div className="student-dashboard-069">
                      <div className="student-dashboard-075">Main University Library and digital<br/>computer pods will remain…</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="student-dashboard-227">
                <div className="student-dashboard-007">
                  <div className="student-dashboard-209">
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-228" />
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-080">Term Milestones</div>
                    </div>
                  </div>
                  <div className="student-dashboard-014">
                    <div className="student-dashboard-038">SEMESTER 2</div>
                  </div>
                </div>
                <div className="student-dashboard-229">
                  <div className="student-dashboard-230">
                    <div className="student-dashboard-231">
                      <div className="student-dashboard-232">
                        <div className="student-dashboard-233">MAR</div>
                      </div>
                      <div className="student-dashboard-232">
                        <div className="student-dashboard-234" />
                      </div>
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-018">
                        <div className="student-dashboard-235">Midterm Examination<br/>Week</div>
                      </div>
                      <div className="student-dashboard-236">
                        <div className="student-dashboard-018">
                          <div className="student-dashboard-075">March 16 – March 20 • All<br/>departments</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="student-dashboard-230">
                    <div className="student-dashboard-231">
                      <div className="student-dashboard-232">
                        <div className="student-dashboard-233">APR</div>
                      </div>
                      <div className="student-dashboard-232">
                        <div className="student-dashboard-237" />
                      </div>
                    </div>
                    <div className="student-dashboard-014">
                      <div className="student-dashboard-018">
                        <div className="student-dashboard-235">Grading Clearance<br/>Deadline</div>
                      </div>
                      <div className="student-dashboard-236">
                        <div className="student-dashboard-018">
                          <div className="student-dashboard-075">April 25 • Final submissions<br/>&amp; audits</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="student-dashboard-238" />
            </div>
          </div>
        </div>
      </div>
      <div className="student-dashboard-239">
        <div className="student-dashboard-240">
          <div className="student-dashboard-241">
            <div className="student-dashboard-242">
              <div className="student-dashboard-243">
                <div className="student-dashboard-069">
                  <div className="student-dashboard-244">Search courses, instructors, grades...</div>
                </div>
              </div>
              <div className="student-dashboard-245" />
            </div>
          </div>
          <div className="student-dashboard-085">
            <div className="student-dashboard-246">
              <div className="student-dashboard-014">
                <div className="student-dashboard-247" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-065">AY 2025–2026 • 2nd Semester</div>
              </div>
            </div>
            <div className="student-dashboard-248">
              <div className="student-dashboard-249">
                <div className="student-dashboard-250" />
              </div>
              <div className="student-dashboard-251">
                <div className="student-dashboard-252">3</div>
              </div>
            </div>
            <div className="student-dashboard-253">
              <div className="student-dashboard-254">
                <div className="student-dashboard-014">
                  <div className="student-dashboard-255" />
                </div>
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-018">
                  <div className="student-dashboard-235">Alex Morgan</div>
                </div>
                <div className="student-dashboard-018">
                  <div className="student-dashboard-256">BS Computer Science • Year 3</div>
                </div>
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-257" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="student-dashboard-258">
        <div className="student-dashboard-018">
          <div className="student-dashboard-259">
            <div className="student-dashboard-260">
              <div className="student-dashboard-014">
                <div className="student-dashboard-261" />
              </div>
            </div>
            <div className="student-dashboard-014">
              <div className="student-dashboard-069">
                <div className="student-dashboard-092">Student Portal</div>
              </div>
              <div className="student-dashboard-069">
                <div className="student-dashboard-065">University SIS</div>
              </div>
            </div>
          </div>
          <div className="student-dashboard-262">
            <div className="student-dashboard-263">
              <div className="student-dashboard-264" />
              <div className="student-dashboard-265">
                <div className="student-dashboard-065">Active Student • AY 2025–2026</div>
              </div>
            </div>
          </div>
          <div className="student-dashboard-266">
            <div className="student-dashboard-267">
              <div className="student-dashboard-268">ACADEMIC MENU</div>
            </div>
          </div>
          <div className="student-dashboard-269">
            <div className="student-dashboard-270">
              <div className="student-dashboard-014">
                <div className="student-dashboard-271" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-272">Dashboard</div>
              </div>
            </div>
            <div className="student-dashboard-273">
              <div className="student-dashboard-014">
                <div className="student-dashboard-274" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-046">Class Schedule</div>
              </div>
            </div>
            <div className="student-dashboard-273">
              <div className="student-dashboard-014">
                <div className="student-dashboard-275" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-046">Enrolled Courses</div>
              </div>
            </div>
            <div className="student-dashboard-273">
              <div className="student-dashboard-014">
                <div className="student-dashboard-276" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-046">Grades</div>
              </div>
            </div>
            <div className="student-dashboard-273">
              <div className="student-dashboard-014">
                <div className="student-dashboard-274" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-046">Attendance</div>
              </div>
            </div>
          </div>
        </div>
        <div className="student-dashboard-041">
          <div className="student-dashboard-266">
            <div className="student-dashboard-267">
              <div className="student-dashboard-268">SYSTEM</div>
            </div>
          </div>
          <div className="student-dashboard-269">
            <div className="student-dashboard-273">
              <div className="student-dashboard-014">
                <div className="student-dashboard-277" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-046">Settings</div>
              </div>
            </div>
            <div className="student-dashboard-273">
              <div className="student-dashboard-014">
                <div className="student-dashboard-278" />
              </div>
              <div className="student-dashboard-014">
                <div className="student-dashboard-046">Logout</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
