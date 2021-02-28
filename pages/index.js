import Head from 'next/head'
import Link from 'next/link'
import {useCallback, useEffect, useState} from "react";
import * as SunCalc from 'suncalc'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationArrow,  faQuestionCircle} from '@fortawesome/free-solid-svg-icons'
import {Backdrop, Button, Fade, makeStyles, Modal} from "@material-ui/core";
import LocationOnIcon from '@material-ui/icons/LocationOn';
import {HelpOutline} from "@material-ui/icons";

function addDays(date, days) {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function zeroPadding(num,length){
  return ('0000000000' + num).slice(-length);
}

const useStyles = makeStyles((theme) => ({
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
}));

const Home = () => {
  const classes = useStyles();
  const [state, setState] = useState({
    timeString: "00:00:00",
    dayStartTime: 0,
    sunsetTime: 0,
    dayEndTime: 0,
    yesterdaySunsetTime: 0,
    calcSecPerRealMS: 1,
    latitude: 35.41,
    longitude: 139.41,
  });
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const calcStartTime = useCallback((date, latitude, longitude) => {
    const times = SunCalc.getTimes(date, latitude, longitude);
    const tomorrowTimes = SunCalc.getTimes(addDays(date, 1), latitude, longitude);
    const yesterdayTimes = SunCalc.getTimes(addDays(date, -1), latitude, longitude);
    setState((prev) => ({
      ...prev,
      dayStartTime: times.sunrise,
      sunsetTime: times.sunset,
      dayEndTime: tomorrowTimes.sunrise,
      yesterdaySunsetTime: yesterdayTimes.sunset
    }));
    const newState = {
      dayStartTime: times.sunrise,
      sunsetTime: times.sunset,
      dayEndTime: tomorrowTimes.sunrise,
      yesterdaySunsetTime: yesterdayTimes.sunset
    }
    return newState;
  }, [setState]);
  const getLatitudeAndLongitude = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }));
          calcStartTime(new Date(), pos.coords.latitude, pos.coords.longitude);
        },
        err => {
          console.log("error");
        }
    );
  }, [calcStartTime]);
  const changeDay = useCallback(() => {
    calcStartTime(new Date(), state.latitude, state.longitude);
  }, [state, calcStartTime]);
  const getCurrentTimeString = useCallback(() => {
    if (!state.dayEndTime) {
      changeDay();
      return;
    }
    const currentDate = new Date();
    let times = null;
    if (state.dayEndTime < currentDate) {
      times = changeDay();
    }
    const dayStartTime = (times)? times.dayStartTime: state.dayStartTime;
    const sunsetTime = (times)? times.sunsetTime: state.sunsetTime;
    const dayEndTime = (times)? times.dayEndTime: state.dayEndTime;
    const yesterdaySunsetTime = (times)? times.yesterdaySunsetTime: state.yesterdaySunsetTime;

    const basisTime = 1000 * 60 * 60 * 12;
    if (currentDate < dayStartTime) {
      const realTimeAfterSunSet = currentDate - yesterdaySunsetTime;
      const nightTime = dayStartTime - yesterdaySunsetTime;
      // 計算上の1ミリ秒を実際のミリ秒で表現
      const realMsForCalcMs = nightTime / basisTime;
      const calcMS = realTimeAfterSunSet / realMsForCalcMs;
      const hour = Math.floor(calcMS / (1000 * 60 * 60)) + 12;
      const min = Math.floor((calcMS % (1000 * 60 * 60)) / (1000 * 60));
      const sec = Math.floor((calcMS % (1000 * 60)) / (1000));
      setState((prev) => ({
        ...prev,
        calcSecPerRealMS: realMsForCalcMs,
        timeString: `${zeroPadding(hour, 2)}:${zeroPadding(min, 2)}:${zeroPadding(sec, 2)}`
      }));
    }
    else if (currentDate > sunsetTime) {
      const realTimeAfterSunSet = currentDate - sunsetTime;
      const nightTime = dayEndTime - sunsetTime;
      // 計算上の1ミリ秒を実際のミリ秒で表現
      const realMsForCalcMs = nightTime / basisTime;
      const calcMS = realTimeAfterSunSet / realMsForCalcMs;
      const hour = Math.floor(calcMS / (1000 * 60 * 60)) + 12;
      const min = Math.floor((calcMS % (1000 * 60 * 60)) / (1000 * 60));
      const sec = Math.floor((calcMS % (1000 * 60)) / (1000));
      setState((prev) => ({
        ...prev,
        calcSecPerRealMS: realMsForCalcMs,
        timeString: `${zeroPadding(hour, 2)}:${zeroPadding(min, 2)}:${zeroPadding(sec, 2)}`
      }));
    } else {
      const realTimeAfterDayStart = currentDate - dayStartTime;
      const dayTime = sunsetTime - dayStartTime;
      // 計算上の1ミリ秒を実際のミリ秒で表現
      const realMsForCalcMs = dayTime / basisTime;
      const calcMS = realTimeAfterDayStart / realMsForCalcMs;
      const hour = Math.floor(calcMS / (1000 * 60 * 60));
      const min = Math.floor((calcMS % (1000 * 60 * 60)) / (1000 * 60));
      const sec = Math.floor((calcMS % (1000 * 60)) / (1000));
      setState((prev) => ({
        ...prev,
        calcSecPerRealMS: realMsForCalcMs,
        timeString: `${zeroPadding(hour, 2)}:${zeroPadding(min, 2)}:${zeroPadding(sec, 2)}`
      }));
    }
  }, [changeDay, state.dayStartTime, state.sunsetTime, state.dayEndTime, setState]);
  useEffect(() => {
    const intervalId = setInterval(()=>{
      getCurrentTimeString();
    }, 1000);
    return () => clearInterval(intervalId);
  }, [getCurrentTimeString]);
  return (
    <div className="container">
      <Head>
        <title>Outdoor clock</title>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta property="og:url" content="https://outdoorclock.vercel.app/" />
        <meta property="og:title" content="Outdoor Clock" />
        <meta property="og:description" content="日の入りを00:00、日の出を12:00に設定した不定時制の時計です。午前と午後で1秒の長さが変わります。アウトドアのおともにどうぞ。" />
        <meta property="og:image" content="https://outdoorclock.vercel.app/thumb.jpg" />
      </Head>

      <main>
        <h1 className="title">
          {state.timeString}
        </h1>
        <Modal
            aria-labelledby="transition-modal-title"
            aria-describedby="transition-modal-description"
            className={classes.modal}
            open={open}
            onClose={handleClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
              timeout: 500,
            }}
        >
          <Fade in={open}>
            <div className={classes.paper}>
              <h2 id="transition-modal-title">Outdoor clock</h2>
              <p id="transition-modal-description">日の出を00:00、日の入りを12:00とする不定時制の時計です。</p>
              <p>午前と午後で1秒の長さが変わります。</p>
              <p>アウトドアのおともにどうぞ。</p>
            </div>
          </Fade>
        </Modal>
      </main>
      <footer>
        <span className={"logo"}>Outdoor Clock</span>
        <div className={"icons"}>
          <Button
              onClick={getLatitudeAndLongitude}
              variant="contained"
              color="secondary"
              startIcon={<LocationOnIcon />}
          >
            Set Location
          </Button>
          <Button
              onClick={handleOpen}
              variant="contained"
              startIcon={<HelpOutline />}
          >
            About
          </Button>
        </div>
      </footer>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .icon {
          height: 24px;
          cursor: pointer;
        }
        .icons {
          position: absolute;
          right: 5px;
          width: 300px;
          display: flex;
        }
        .logo {
          position: absolute;
          left: 32px;
        }
        .fa {
          font-size: 12px;
        }
        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        footer {
          width: 100%;
          height: 60px;
          border-top: 1px solid #eaeaea;
          display: flex;
          justify-content: center;
          align-items: center;
          position: fixed;
          bottom: 0px;
        }

        footer img {
          margin-left: 0.5rem;
        }

        footer a {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .title a {
          color: #0070f3;
          text-decoration: none;
        }

        .title a:hover,
        .title a:focus,
        .title a:active {
          text-decoration: underline;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
        }

        .title,
        .description {
          text-align: center;
        }

        .description {
          line-height: 1.5;
          font-size: 1.5rem;
        }

        code {
          background: #fafafa;
          border-radius: 5px;
          padding: 0.75rem;
          font-size: 1.1rem;
          font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
            DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
        }

        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;

          max-width: 800px;
          margin-top: 3rem;
        }

        .card {
          margin: 1rem;
          flex-basis: 45%;
          padding: 1.5rem;
          text-align: left;
          color: inherit;
          text-decoration: none;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .card:hover,
        .card:focus,
        .card:active {
          color: #0070f3;
          border-color: #0070f3;
        }

        .card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }

        .card p {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.5;
        }

        .logo {
          height: 1em;
        }

        @media (max-width: 600px) {
          .grid {
            width: 100%;
            flex-direction: column;
          }
        }
      `}</style>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}

export default Home;