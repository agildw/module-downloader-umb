const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const readlineSync = require("readline-sync");
const chalk = require("chalk");

const url = readlineSync.question("Enter module url: ");
if (
  !url.includes(".php?") ||
  !url.includes("kd_mk") ||
  !url.includes("namamk")
) {
  console.log(chalk.red("Invalid URL"));
  return;
}

const params = url.split("?")[1];
const urlParams = params.split("&");

let moduleName;

if (urlParams[1]) {
  moduleName = urlParams[1].split("=")[1].replace(/%20/g, " ");
} else {
  moduleName = urlParams[0].split("=")[1];
}
const getModule = async (url) => {
  axios
    .get(url)
    .then((response) => {
      if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);
        const modul = [];
        $("tr").each(function () {
          const creator = $(this).find("td").first().text();
          const fileName = $(this).find("td").eq(3).text();
          const link = $(this).find("a").attr("href");
          if (link) {
            modul.push({
              creator,
              fileName,
              link,
            });
          }
        });
        //create download folder if not exist
        if (!fs.existsSync("downloads")) {
          fs.mkdirSync("downloads");
        }

        if (!fs.existsSync(`./downloads/${moduleName}`)) {
          fs.mkdirSync(`./downloads/${moduleName}`);
        }

        fs.writeFileSync(
          `./downloads/${moduleName}/info.json`,
          JSON.stringify(
            {
              moduleCount: modul.length,
              link: url,
              modules: modul,
            },
            null,
            2
          ),
          "utf-8",
          (err) => {
            if (err) {
              console.log(err.message);
            }
          }
        );

        const domain = url.match(/(https?:\/\/[^/]+)/)[1];

        let pendingDownload = modul.length;
        let successDownload = 0;
        let failedDownload = 0;

        console.log(`Total ${chalk.yellow(pendingDownload)} files to download`);
        // await setTimeout(1000);
        modul.forEach((m, index) => {
          const creatorName = m.creator.replace(/^\s+|\s+$/g, "");

          const path = `./downloads/${moduleName}/${creatorName}`;
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path, {
              recursive: true,
            });
          }

          setTimeout(() => {
            console.log(chalk.yellow("Downloading"), m.fileName);

            axios({
              method: "GET",
              url: domain + "/" + m.link,
              responseType: "stream",
            })
              .then((response) => {
                response.data.pipe(
                  fs.createWriteStream(
                    `./downloads/${moduleName}/${creatorName}/${m.fileName}`
                  )
                );
                console.log(chalk.green("Downloaded"), m.fileName);
                successDownload++;
                pendingDownload--;
                if (pendingDownload === 0) {
                  console.log(chalk.green("Download completed"));
                  console.log(
                    chalk.green(
                      `Success: ${successDownload}, Failed: ${failedDownload}, Total: ${modul.length}`
                    )
                  );
                  const info = JSON.parse(
                    fs.readFileSync(
                      `./downloads/${moduleName}/info.json`,
                      "utf-8"
                    )
                  );
                  info.successDownload = successDownload;
                  info.failedDownload = failedDownload;
                  fs.writeFileSync(
                    `./downloads/${moduleName}/info.json`,
                    JSON.stringify(info, null, 2),
                    "utf-8",
                    (err) => {
                      if (err) {
                        console.log(err.message);
                      }
                    }
                  );
                  process.exit(0);
                }
              })
              .catch((err) => {
                console.log(err.message);
                console.log(
                  `${chalk.red("Failed")} to download ${
                    m.fileName
                  } created by ${m.creator}`
                );
                failedDownload++;
                pendingDownload--;
                if (pendingDownload === 0) {
                  console.log(chalk.green("Download completed"));
                  console.log(
                    chalk.green(
                      `Success: ${successDownload}, Failed: ${failedDownload}, Total: ${modul.length}`
                    )
                  );

                  const info = JSON.parse(
                    fs.readFileSync(
                      `./downloads/${moduleName}/info.json`,
                      "utf-8"
                    )
                  );
                  info.successDownload = successDownload;
                  info.failedDownload = failedDownload;
                  fs.writeFileSync(
                    `./downloads/${moduleName}/info.json`,
                    JSON.stringify(info, null, 2),
                    "utf-8",
                    (err) => {
                      if (err) {
                        console.log(err.message);
                      }
                    }
                  );
                  process.exit(0);
                }
              });
          }, 500 * index);
        });
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
};
getModule(url);
