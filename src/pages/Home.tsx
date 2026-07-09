import { useState } from "react";
import { tv } from "tailwind-variants";
import reactLogo from "@/assets/react.svg";
import viteLogo from "@/assets/vite.svg";
import heroImg from "@/assets/hero.png";

const counter = tv({
  base: "mb-6 inline-flex rounded-[5px] border-2 border-transparent bg-accent-bg px-2.5 py-[5px] font-mono text-[16px] text-accent transition-[border-color] duration-300 hover:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

const linkButton = tv({
  base: "flex items-center gap-2 rounded-md bg-social-bg px-3 py-1.5 text-[16px] text-heading transition-shadow duration-300 hover:shadow-card max-lg:w-full max-lg:justify-center",
});

const ticks = tv({
  base: "relative w-full before:absolute before:-top-[4.5px] before:left-0 before:border-[5px] before:border-transparent before:border-l-edge after:absolute after:-top-[4.5px] after:right-0 after:border-[5px] after:border-transparent after:border-r-edge",
});

function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      <section
        id="center"
        className="flex grow flex-col place-content-center place-items-center gap-[25px] max-lg:gap-[18px] max-lg:px-5 max-lg:pt-8 max-lg:pb-6"
      >
        <div className="relative">
          <img
            src={heroImg}
            className="relative z-0 mx-auto w-[170px]"
            width="170"
            height="179"
            alt=""
          />
          <img
            src={reactLogo}
            className="absolute inset-x-0 top-[34px] z-1 mx-auto h-7 [transform:perspective(2000px)_rotateZ(300deg)_rotateX(44deg)_rotateY(39deg)_scale(1.4)]"
            alt="React logo"
          />
          <img
            src={viteLogo}
            className="absolute inset-x-0 top-[107px] z-0 mx-auto h-[26px] [transform:perspective(2000px)_rotateZ(300deg)_rotateX(40deg)_rotateY(39deg)_scale(0.8)]"
            alt="Vite logo"
          />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/pages/Home.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button type="button" className={counter()} onClick={() => setCount((prev) => prev + 1)}>
          Count is {count}
        </button>
      </section>

      <div className={ticks()}></div>

      <section
        id="next-steps"
        className="flex border-t border-edge text-left max-lg:flex-col max-lg:text-center"
      >
        <div
          id="docs"
          className="flex-1 border-r border-edge p-8 max-lg:border-r-0 max-lg:border-b max-lg:px-5 max-lg:py-6"
        >
          <svg className="mb-4 size-5.5 max-lg:mx-auto" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul className="mt-8 flex gap-2 max-lg:mt-5 max-lg:flex-wrap max-lg:justify-center">
            <li className="max-lg:flex-[1_1_calc(50%-8px)]">
              <a className={linkButton()} href="https://vite.dev/" target="_blank">
                <img className="h-4.5" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li className="max-lg:flex-[1_1_calc(50%-8px)]">
              <a className={linkButton()} href="https://react.dev/" target="_blank">
                <img className="size-4.5" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social" className="flex-1 p-8 max-lg:px-5 max-lg:py-6">
          <svg className="mb-4 size-5.5 max-lg:mx-auto" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul className="mt-8 flex gap-2 max-lg:mt-5 max-lg:flex-wrap max-lg:justify-center">
            <li className="max-lg:flex-[1_1_calc(50%-8px)]">
              <a className={linkButton()} href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="size-4.5 dark:brightness-200 dark:invert"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li className="max-lg:flex-[1_1_calc(50%-8px)]">
              <a className={linkButton()} href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="size-4.5 dark:brightness-200 dark:invert"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li className="max-lg:flex-[1_1_calc(50%-8px)]">
              <a className={linkButton()} href="https://x.com/vite_js" target="_blank">
                <svg
                  className="size-4.5 dark:brightness-200 dark:invert"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li className="max-lg:flex-[1_1_calc(50%-8px)]">
              <a className={linkButton()} href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="size-4.5 dark:brightness-200 dark:invert"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className={ticks()}></div>
      <section id="spacer" className="h-[88px] border-t border-edge max-lg:h-12"></section>
    </>
  );
}

export default Home;
