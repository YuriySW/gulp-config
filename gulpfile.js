import gulp from 'gulp';
import browserSync from 'browser-sync';
import * as sassPkg from 'sass';
import gulpSass from 'gulp-sass';
import gulpCssimport from 'gulp-cssimport';
import {deleteAsync} from 'del';
import htmlmin from 'gulp-htmlmin';
import cleanCSS from 'gulp-clean-css';
import terser from 'gulp-terser';
import concat from 'gulp-concat';
import sourсemaps from 'gulp-sourcemaps';
import plumber from 'gulp-plumber';
import webpackStream from 'webpack-stream';
import webpack from 'webpack';
import gulpif from 'gulp-if';
import rename from 'gulp-rename';
import gulpImg from 'gulp-image';
import gulpWebp from 'gulp-webp';
import gulpAvif from 'gulp-avif';
import {stream as critical} from 'critical';
import autoPrefixer from 'gulp-autoprefixer';
import babel from 'gulp-babel';

let dev = false;
const prepros = true;

const sass = gulpSass(sassPkg);

// const allJS = ['src/script/modules/render.js', 'src/script/modules/timer.js'];

const webpackConf = {
  mode: dev ? 'development' : 'production',
  devtool: dev ? 'eval-source-map' : false,
  optimization: {
    minimize: false,
  },
  output: {
    filename: 'index.js',
  },
  module: {
    rules: [],
  },
};

if (!dev) {
  webpackConf.module.rules.push({
    test: /\.(js)$/,
    exclude: /(node_modules)/,
    loader: 'babel-loader',
  });
}

// задачи
export const favicon = () =>
  gulp
    .src('src/favicon/**/*')
    .pipe(gulp.dest('dist/favicon'))
    .pipe(browserSync.stream({once: true}));

export const html = () =>
  gulp
    .src('src/*.html')
    .pipe(
      htmlmin({
        removeComments: true,
        collapseWhitespace: true,
      })
    )
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());

export const style = () => {
  if (prepros) {
    return gulp
      .src('src/scss/**/*.scss')
      .pipe(gulpif(dev, sourсemaps.init()))
      .pipe(sass().on('error', sass.logError))
      .pipe(autoPrefixer())
      .pipe(
        cleanCSS({
          2: {
            specialComments: 0,
          },
        })
      )
      .pipe(gulpif(dev, sourсemaps.write('../maps')))
      .pipe(gulp.dest('dist/css'))
      .pipe(browserSync.stream());
  }
  return gulp
    .src('src/css/**/*.css')
    .pipe(soursemaps.init())
    .pipe(
      gulpCssimport({
        extensions: ['css'],
      })
    )
    .pipe(autoPrefixer())
    .pipe(
      cleanCSS({
        2: {
          specialComments: 0,
        },
      })
    )
    .pipe(sourсemaps.write('../maps'))
    .pipe(gulp.dest('dist/css'))
    .pipe(browserSync.stream());
};

export const js = () =>
  gulp
    .src('src/script/**/*.js')
    .pipe(gulpif(dev, sourсemaps.init()))
    .pipe(
      babel({
        presets: ['@babel/preset-env'],
        ignore: ['src/script/**/*.min.js'],
      })
    )
    .pipe(plumber())
    .pipe(webpackStream(webpackConf, webpack))
    // .pipe(gulpif(!dev, gulp.dest('dist/script')))
    .pipe(gulpif(!dev, terser()))
    .pipe(
      rename({
        suffix: '.min',
      })
    )
    .pipe(gulpif(dev, sourсemaps.write('../maps')))
    .pipe(gulp.dest('dist/script'))
    .pipe(browserSync.stream());

// export const js = () =>
//   gulp
//     .src([...allJS, 'src/script/**/*.js'])
//     .pipe(terser())
//     .pipe(concat('index.min.js'))
//     .pipe(gulp.dest('dist/script'))
//     .pipe(browserSync.stream());

export const img = () =>
  gulp
    .src('src/image/**/*.{jpg,jpeg,png,svg,gif}')
    .pipe(
      gulpif(
        !dev,
        gulpImg({
          optipng: ['-i 1', '-strip all', '-fix', '-o4', '-force'],
          pngquant: ['--speed=1', '--force', 256],
          zopflipng: ['-y', '--lossy_8bit', '--lossy_transparent'],
          jpegRecompress: ['--strip', '--quality', 'medium', '--min', 60, '--max', 90],
          mozjpeg: ['-optimize', '-progressive'],
          gifsicle: ['--optimize'],
          svgo: true,
        })
      )
    )
    .pipe(gulp.dest('dist/image'))
    .pipe(browserSync.stream());

export const webp = () =>
  gulp
    .src('src/image/**/*.{jpg,jpeg,png}')
    .pipe(gulpWebp({quality: 70}))
    .pipe(gulp.dest('dist/image'))
    .pipe(browserSync.stream());

export const avif = () =>
  gulp
    .src('src/image/**/*.{jpg,jpeg,png}')
    .pipe(gulpAvif({quality: 70}))
    .pipe(gulp.dest('dist/image'))
    .pipe(browserSync.stream());

export const critCSS = () =>
  gulp
    .src('dist/*.html')
    .pipe(
      critical({
        base: 'dist/',
        inline: true,
        css: ['dist/css/index.css'],
      })
    )
    .on('error', (err) => {
      console.error(err.message);
    })
    .pipe(gulp.dest('dist'));

export const copy = () =>
  gulp
    .src('src/fonts/**/*', {
      base: 'src',
    })
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream({once: true}));

export const server = () => {
  browserSync.init({
    ui: false,
    notify: false,
    // tunnel: true,
    server: {
      baseDir: 'dist',
    },
  });

  gulp.watch('./src/**/*.html', html);
  gulp.watch(prepros ? './src/scss/**/*.scss' : './src/css/**/*.css', style);
  gulp.watch('src/image/**/*.{jpg,jpeg,png,svg,gif}', img);
  gulp.watch('./src/script/**/*.js', js);
  gulp.watch('./src/fonts/**/*', copy);
  gulp.watch('./src/favicon/**/*', favicon);
  gulp.watch('src/image/**/*.{jpg,jpeg,png}', webp);
  gulp.watch('src/image/**/*.{jpg,jpeg,png}', avif);
};

export const clear = (done) => {
  return deleteAsync(['dist/**/*'], {
    force: true,
  }).then(() => done());
};

// запуск

export const develop = async () => {
  dev = true;
};

export const base = gulp.parallel(html, style, js, img, avif, webp, copy, favicon);

export const build = gulp.series(clear, base, critCSS);

export default gulp.series(develop, base, server);
