import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASICS_ARTICLES, type BasicsArticle } from '../content/basics';
import { clamp } from '../engine/constants';
import { mirrorWalkthrough } from '../engine/mirror';
import { computeGuides } from '../engine/physics';
import { buildScene, getShot, SHOTS } from '../engine/shots';
import type { Ball, MirrorStep, Scene, ShotDef, Spin } from '../engine/types';
import { BasicsArticleView } from './BasicsArticleView';
import { BasicsInfo } from './BasicsInfo';
import { ControlsPanel } from './ControlsPanel';
import { MirrorWalkthroughPanel } from './MirrorWalkthroughPanel';
import { MobileActionBar, TAB_LABEL, type SheetTab } from './MobileActionBar';
import { CueViewCanvas } from './CueViewCanvas';
import { DifficultyPips } from './DifficultyPips';
import { useLayoutMode } from './hooks/useMediaQuery';
import { usePlayback } from './hooks/usePlayback';
import { useViewSplit, type MaximizedView } from './hooks/useViewSplit';
import { predictedOutcome } from './outcome';
import { ShotInfo } from './ShotInfo';
import { SectionPager } from './SectionPager';
import { Sidebar } from './Sidebar';
import { TopDownCanvas } from './TopDownCanvas';
import { ViewSplitter } from './ViewSplitter';
import { ViewTabs } from './ViewTabs';

const AIM_LIMIT = 8;
const SHEET_ID = 'controls-sheet';

function isFormField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

export function App() {
  const [scene, setScene] = useState<Scene>(() => buildScene(SHOTS[0]));
  const [showGuides, setShowGuides] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [mirrorStep, setMirrorStep] = useState<MirrorStep | null>(null);
  const [ghostAlpha, setGhostAlpha] = useState(0.75);
  const [articleId, setArticleId] = useState<string | null>(null);
  const { compact, drawerLayout, coarse } = useLayoutMode();
  const [navOpen, setNavOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Which half of the phone sheet is showing: the aim controls, or the shot's
  // teaching text (description, tips, and the mirror walkthrough).
  const [sheetTab, setSheetTab] = useState<SheetTab>('controls');
  // A portrait phone wants an even split: the table is 2:1 and a 2/3 share would
  // leave a wide empty band. Only consulted on first run, before anything is stored.
  const { topShare, maximized, setTopShare, resetSplit, toggleMaximized, setMaximized } = useViewSplit(
    compact ? 0.5 : undefined,
  );
  const viewStackRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const activeArticle: BasicsArticle | null = useMemo(
    () => (articleId ? (BASICS_ARTICLES.find((a) => a.id === articleId) ?? null) : null),
    [articleId],
  );

  const playback = usePlayback(scene, speed);

  const guides = useMemo(() => computeGuides(scene), [scene]);
  const outcome = useMemo(() => predictedOutcome(scene.shot, guides), [scene.shot, guides]);
  const mirrorData = useMemo(() => mirrorWalkthrough(scene, guides), [scene, guides]);
  const mirror = mirrorStep !== null && mirrorData ? { data: mirrorData, step: mirrorStep } : null;

  const viewBalls: Ball[] = playback.status === 'idle' ? scene.balls : playback.balls ?? scene.balls;
  // 'settled' renders as animating too: the finished table stays clean (no
  // stale aim line, ghost outline, or cue stick) until Reset or Replay.
  const animating = playback.status !== 'idle';

  const closeNav = useCallback(() => setNavOpen(false), []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  /*
   * Both halves are named in the action bar, so a tap means "show me this one".
   * Tapping the half already on screen is the way back to a full-height table,
   * which keeps the pair working as the open/close toggle they replaced.
   */
  const selectSheetTab = useCallback(
    (tab: SheetTab) => {
      setSheetOpen((open) => !(open && tab === sheetTab));
      setSheetTab(tab);
    },
    [sheetTab],
  );

  /*
   * Asking for both views while the sheet is open is asking for the one thing a
   * phone cannot give (see `shownView` below), so it closes the sheet instead of
   * silently doing nothing.
   */
  const chooseView = useCallback(
    (view: MaximizedView) => {
      if (view === null) setSheetOpen(false);
      setMaximized(view);
    },
    [setMaximized],
  );

  /* The walkthrough's captions live in the sheet; its construction is drawn on
   * the bird's-eye view, which `shownView` hands it for the duration. */
  const startMirror = useCallback(() => {
    if (compact) {
      setSheetTab('lesson');
      setSheetOpen(true);
    }
    setMirrorStep(1);
  }, [compact]);

  const selectShot = useCallback(
    (shot: ShotDef) => {
      playback.reset();
      setMirrorStep(null);
      setArticleId(null);
      setNavOpen(false);
      setScene(buildScene(shot));
      // Choosing a lesson from the library asks to be taught it, so the phone
      // answers with the lesson rather than a bare table. On desktop that same
      // text is already sitting in the side panel.
      if (compact) {
        setSheetTab('lesson');
        setSheetOpen(true);
      }
    },
    [playback, compact],
  );

  const selectArticle = useCallback(
    (article: BasicsArticle) => {
      playback.reset();
      setMirrorStep(null);
      setNavOpen(false);
      closeSheet();
      setArticleId(article.id);
    },
    [playback, closeSheet],
  );

  const jumpToShot = useCallback(
    (shotId: string) => {
      const shot = getShot(shotId);
      if (!shot) return;
      selectShot(shot);
    },
    [selectShot],
  );

  const handleReset = useCallback(() => {
    playback.reset();
    setMirrorStep(null);
    setScene((prev) => buildScene(prev.shot));
  }, [playback]);

  const handlePlay = useCallback(() => {
    // On a phone the sheet takes half the screen — hand that space back so the
    // shot that was just dialled in is actually watchable.
    closeSheet();
    playback.play();
  }, [playback, closeSheet]);

  const setPower = useCallback((power: number) => {
    setScene((prev) => ({ ...prev, aim: { ...prev.aim, power } }));
  }, []);

  const setSpin = useCallback((spin: Spin) => {
    setScene((prev) => ({ ...prev, aim: { ...prev.aim, spin } }));
  }, []);

  const setAngleOffset = useCallback((angleOffsetDeg: number) => {
    setScene((prev) => ({
      ...prev,
      aim: { ...prev.aim, angleOffsetDeg: clamp(angleOffsetDeg, -AIM_LIMIT, AIM_LIMIT) },
    }));
  }, []);

  const nudgeAim = useCallback(
    (delta: number) => {
      setScene((prev) => ({
        ...prev,
        aim: { ...prev.aim, angleOffsetDeg: clamp(prev.aim.angleOffsetDeg + delta, -AIM_LIMIT, AIM_LIMIT) },
      }));
    },
    [],
  );

  const recenterAim = useCallback(() => setAngleOffset(0), [setAngleOffset]);

  const handleDragBall = useCallback(
    (id: string, x: number, y: number) => {
      // A drag always edits the live scene; if we were showing a settled animation's
      // final frame, drop back to idle so the canvas reflects scene.balls again.
      if (playback.status === 'settled') playback.reset();
      setScene((prev) => ({
        ...prev,
        balls: prev.balls.map((b) => (b.id === id ? { ...b, x, y } : b)),
      }));
    },
    [playback],
  );

  /*
   * The pages of the section on screen: the articles under The Basics, or the
   * shots sharing the current shot's category. Paging stays inside the section,
   * so the arrows have a defined start and end.
   */
  const section = useMemo(() => {
    if (activeArticle) {
      const items = BASICS_ARTICLES.map((a) => ({ id: a.id, name: a.title }));
      return {
        kind: 'article' as const,
        label: 'The Basics',
        items,
        index: items.findIndex((i) => i.id === activeArticle.id),
      };
    }
    const items = SHOTS.filter((s) => s.category === scene.shot.category).map((s) => ({
      id: s.id,
      name: s.name,
    }));
    return {
      kind: 'shot' as const,
      label: scene.shot.category,
      items,
      index: items.findIndex((i) => i.id === scene.shot.id),
    };
  }, [activeArticle, scene.shot]);

  const pageBy = useCallback(
    (delta: number) => {
      const next = section.items[section.index + delta];
      if (!next) return;
      if (section.kind === 'article') {
        const article = BASICS_ARTICLES.find((a) => a.id === next.id);
        if (article) selectArticle(article);
      } else {
        jumpToShot(next.id);
      }
    },
    [section, selectArticle, jumpToShot],
  );

  /*
   * Switching tabs, or entering a walkthrough, replaces what the sheet holds, so
   * send it back to the top — otherwise the new content opens scrolled into its
   * middle. Not on every step: scrolling away mid-lesson to tweak something and
   * then tapping Next keeps your place.
   */
  useEffect(() => {
    if (compact) sheetRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, sheetTab, mirrorStep !== null]);

  // Leaving a narrow layout drops the overlays it owns, so a resize can never
  // strand a drawer or sheet on a desktop-width screen.
  useEffect(() => {
    if (!drawerLayout) setNavOpen(false);
  }, [drawerLayout]);
  useEffect(() => {
    if (!compact) closeSheet();
  }, [compact, closeSheet]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (navOpen) setNavOpen(false);
        else if (sheetOpen) closeSheet();
        return;
      }
      if (isFormField(document.activeElement)) return;
      if (activeArticle) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (playback.status !== 'playing') playback.play();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeAim(-0.25);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeAim(0.25);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playback, handleReset, nudgeAim, activeArticle, navOpen, sheetOpen, closeSheet]);

  const mirrorRunning = mirrorStep !== null;
  const sheetVisible = compact && sheetOpen;
  const lessonLabel = mirrorRunning ? 'Walkthrough' : TAB_LABEL.lesson;
  const sheetTitle = sheetTab === 'lesson' ? lessonLabel : TAB_LABEL.controls;

  /*
   * Which view the center column actually shows. A phone has room for the sheet
   * OR two stacked views, not both — splitting ~170px of leftover height in two
   * leaves each canvas unreadable — and the walkthrough needs the bird's-eye
   * view to draw on. Both are derived, never stored: the user's persisted split
   * preference survives a reload, and a transient sheet toggle can't leak into
   * the layout the desktop shares through localStorage.
   */
  const shownView: MaximizedView =
    compact && (mirrorRunning || (sheetOpen && maximized === null)) ? 'top' : maximized;
  const showViewLabels = !compact || shownView === null;
  const basicsInfo = activeArticle ? (
    <BasicsInfo article={activeArticle} onJumpToShot={jumpToShot} />
  ) : null;

  const mirrorPanel = (
    <MirrorWalkthroughPanel
      shot={scene.shot}
      step={mirrorStep}
      onStart={startMirror}
      onStep={setMirrorStep}
      onExit={() => setMirrorStep(null)}
    />
  );
  const controlsCard = (
    <ControlsPanel
        status={playback.status}
        onPlay={handlePlay}
        onReset={handleReset}
        power={scene.aim.power}
        onPowerChange={setPower}
        spin={scene.aim.spin}
        onSpinChange={setSpin}
        angleOffsetDeg={scene.aim.angleOffsetDeg}
        onAngleChange={setAngleOffset}
        onRecenterAim={recenterAim}
        showGuides={showGuides}
        onToggleGuides={setShowGuides}
        ghostAlpha={ghostAlpha}
        onGhostAlphaChange={setGhostAlpha}
        speed={speed}
        onSpeedChange={setSpeed}
        outcome={outcome}
        showTransport={!compact}
        touch={coarse}
    />
  );

  /*
   * On a phone the sheet splits in two: the aim controls you reach for between
   * shots, and the lesson — the walkthrough plus the shot's description and tips.
   * Burying that text under a button labelled "Aim & spin" made it unfindable;
   * it is now a named destination one tap away. The desktop panel still stacks
   * everything, because it has the room.
   */
  const lessonCards = (
    <>
      {mirrorPanel}
      <ShotInfo shot={scene.shot} />
    </>
  );

  const panelCards =
    basicsInfo ??
    (compact ? (
      sheetTab === 'lesson' ? (
        lessonCards
      ) : (
        controlsCard
      )
    ) : (
      <>
        {controlsCard}
        {lessonCards}
      </>
    ));

  return (
    <div className="app">
      <header className="header-bar">
        {drawerLayout && (
          <button
            type="button"
            className="nav-toggle"
            onClick={() => setNavOpen((open) => !open)}
            aria-expanded={navOpen}
            aria-controls="shot-library"
            aria-label="Shots"
          >
            <span className="nav-toggle-icon" aria-hidden="true">
              ☰
            </span>
            <span className="nav-toggle-text">Shots</span>
          </button>
        )}
        <h1>Pool Trainer</h1>
        {activeArticle ? (
          <div className="header-shot">
            <span className="header-shot-name">{activeArticle.title}</span>
          </div>
        ) : (
          <div className="header-shot">
            <span className="header-shot-name">{scene.shot.name}</span>
            <DifficultyPips value={scene.shot.difficulty} />
          </div>
        )}

        <SectionPager
          label={section.label}
          index={section.index}
          total={section.items.length}
          prevName={section.items[section.index - 1]?.name ?? null}
          nextName={section.items[section.index + 1]?.name ?? null}
          onPrev={() => pageBy(-1)}
          onNext={() => pageBy(1)}
        />
      </header>

      <div className="body-grid">
        <Sidebar
          activeShotId={activeArticle ? null : scene.shot.id}
          activeArticleId={activeArticle ? activeArticle.id : null}
          onSelect={selectShot}
          onSelectArticle={selectArticle}
          drawer={drawerLayout}
          open={navOpen}
          onClose={closeNav}
        />
        {drawerLayout && navOpen && <div className="scrim" onClick={closeNav} aria-hidden="true" />}

        {activeArticle ? (
          <div className="center-col">
            <BasicsArticleView
              article={activeArticle}
              footer={compact ? basicsInfo : null}
            />
          </div>
        ) : (
          <div className="center-col">
            {compact && <ViewTabs value={shownView} onChange={chooseView} />}
            <div className="view-stack" ref={viewStackRef}>
              {shownView !== 'bottom' && (
                <div
                  className="topdown-wrap"
                  style={{ flexGrow: shownView === 'top' ? 1 : topShare }}
                >
                  {showViewLabels && <span className="view-label">Bird's-eye view</span>}
                  {!compact && (
                    <button
                      type="button"
                      className="view-max-btn"
                      aria-label={maximized === 'top' ? 'Restore split view' : 'Maximize bird\'s-eye view'}
                      title={maximized === 'top' ? 'Restore split view' : 'Maximize view'}
                      onClick={() => toggleMaximized('top')}
                    >
                      {maximized === 'top' ? '⤡' : '⤢'}
                    </button>
                  )}
                  <TopDownCanvas
                    scene={scene}
                    guides={guides}
                    balls={viewBalls}
                    animating={animating}
                    showGuides={showGuides}
                    mirror={mirror}
                    ghostAlpha={ghostAlpha}
                    onDragBall={handleDragBall}
                  />
                </div>
              )}
              {shownView === null && (
                <ViewSplitter
                  containerRef={viewStackRef}
                  onChange={setTopShare}
                  onReset={resetSplit}
                />
              )}
              {shownView !== 'top' && (
                <div
                  className="cueview-wrap"
                  style={{ flexGrow: shownView === 'bottom' ? 1 : 1 - topShare }}
                >
                  {showViewLabels && (
                    <span className="view-label">Behind the cue ball (shooter's view)</span>
                  )}
                  {!compact && (
                    <button
                      type="button"
                      className="view-max-btn"
                      aria-label={maximized === 'bottom' ? 'Restore split view' : 'Maximize cue view'}
                      title={maximized === 'bottom' ? 'Restore split view' : 'Maximize view'}
                      onClick={() => toggleMaximized('bottom')}
                    >
                      {maximized === 'bottom' ? '⤡' : '⤢'}
                    </button>
                  )}
                  <CueViewCanvas
                    scene={scene}
                    guides={guides}
                    balls={viewBalls}
                    animating={animating}
                    showGuides={showGuides}
                    ghostAlpha={ghostAlpha}
                    onDragBall={handleDragBall}
                    onAimChange={setAngleOffset}
                    angleOffsetDeg={scene.aim.angleOffsetDeg}
                  />
                </div>
              )}
            </div>
            {/* While the sheet is open every pixel goes to the table instead. */}
            {!sheetVisible && (
              <p className="hint-bar">
                {coarse
                  ? 'Tip: drag a ball to move it · drag the felt in the shooter view to aim · pinch to zoom'
                  : 'Tip: drag any ball to move it · drag the felt in the shooter view to aim · scroll to zoom · Space plays · R resets · ← → nudge the aim'}
              </p>
            )}
          </div>
        )}

        {/* The phone layout hoists the article's side panel into the article itself. */}
        {!(compact && activeArticle) && (
          <div className="dock">
            <div
              id={SHEET_ID}
              ref={sheetRef}
              className={[
                'right-panel',
                sheetVisible ? 'right-panel-open' : '',
                // reading needs more room than dialling in a shot does
                sheetVisible && sheetTab === 'lesson' ? 'right-panel-tall' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              inert={compact && !sheetOpen}
            >
              {compact && (
                <div className="sheet-head">
                  <span className="sheet-grabber" aria-hidden="true" />
                  <h2 className="sheet-title">{sheetTitle}</h2>
                  <button type="button" className="btn btn-small" onClick={closeSheet}>
                    Done
                  </button>
                </div>
              )}
              {panelCards}
            </div>
            {compact && (
              <MobileActionBar
                status={playback.status}
                outcome={outcome}
                onPlay={handlePlay}
                onReset={handleReset}
                sheetOpen={sheetOpen}
                tab={sheetTab}
                onSelectTab={selectSheetTab}
                sheetId={SHEET_ID}
                lessonLabel={lessonLabel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
