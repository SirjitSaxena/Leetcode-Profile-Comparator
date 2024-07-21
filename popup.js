document.addEventListener("DOMContentLoaded", function () {
  // Load saved URLs from storage
  chrome.storage.sync.get(
    ["myProfileUrl", "competitorProfileUrl"],
    function (data) {
      if (data.myProfileUrl) {
        document.getElementById("myProfile").value = data.myProfileUrl;
      }
      if (data.competitorProfileUrl) {
        document.getElementById("competitorProfile").value =
          data.competitorProfileUrl;
      }
    }
  );

  document
    .getElementById("profileForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const myProfile = document.getElementById("myProfile").value;
      const competitorProfile =
        document.getElementById("competitorProfile").value;

      // Save URLs to storage
      chrome.storage.sync.set({
        myProfileUrl: myProfile,
        competitorProfileUrl: competitorProfile,
      });

      const resultDiv = document.getElementById("result");
      resultDiv.innerHTML = "Loading...";

      try {
        const myProfileData = await fetchProfileData(myProfile);
        const competitorProfileData = await fetchProfileData(competitorProfile);
        const myContestData = await fetchContestData(myProfile);
        const competitorContestData = await fetchContestData(competitorProfile);

        const comparisonResult = compareProfiles(
          myProfileData,
          competitorProfileData,
          myContestData,
          competitorContestData
        );
        const myAverageSubmissions = calculateAverageSubmissions(
          myProfileData.submissionCalendar
        );
        const competitorAverageSubmissions = calculateAverageSubmissions(
          competitorProfileData.submissionCalendar
        );

        resultDiv.innerHTML = generateComparisonHtml(
          comparisonResult,
          myAverageSubmissions,
          competitorAverageSubmissions,
          myContestData,
          competitorContestData
        );
      } catch (error) {
        resultDiv.innerHTML = `Error: ${error.message}`;
        console.error(error); // Log the error for debugging purposes
      }
    });
});

async function fetchProfileData(profileUrl) {
  const apiUrl = "https://leetcode-api-faisalshohag.vercel.app"; // Update with your correct API URL

  try {
    const response = await fetch(`${apiUrl}/${encodeURIComponent(profileUrl)}`);
    if (!response.ok) {
      throw new Error("Failed to fetch profile data");
    }

    const data = await response.json();
    console.log("Fetched profile data:", data); // Log the fetched data for debugging purposes

    if (!data) {
      throw new Error("No profile data found");
    }

    return data; // Return the entire data object
  } catch (error) {
    console.error("Error fetching profile data:", error);
    throw error; // Re-throw the error to handle it in the caller function
  }
}

async function fetchContestData(profileUrl) {
  const apiUrl = `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(
    profileUrl
  )}/contest`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch contest data");
    }

    const data = await response.json();
    console.log("Fetched contest data:", data); // Log the fetched data for debugging purposes

    return data;
  } catch (error) {
    console.error("Error fetching contest data:", error);
    throw error;
  }
}

function compareProfiles(
  myProfileData,
  competitorProfileData,
  myContestData,
  competitorContestData
) {
  const myProfile = {
    rank: myProfileData.ranking,
    totalSolved: myProfileData.totalSolved,
    acceptanceRate: calculateAcceptanceRate(myProfileData.totalSubmissions),
    solvedEasy: myProfileData.easySolved,
    solvedMedium: myProfileData.mediumSolved,
    solvedHard: myProfileData.hardSolved,
    submissionCalendar: myProfileData.submissionCalendar, // Include submission calendar for future use
    contestAttend: myContestData.contestAttend,
    contestRating: myContestData.contestRating,
    contestGlobalRanking: myContestData.contestGlobalRanking,
    contestTopPercentage: myContestData.contestTopPercentage,
  };

  const competitorProfile = {
    rank: competitorProfileData.ranking,
    totalSolved: competitorProfileData.totalSolved,
    acceptanceRate: calculateAcceptanceRate(
      competitorProfileData.totalSubmissions
    ),
    solvedEasy: competitorProfileData.easySolved,
    solvedMedium: competitorProfileData.mediumSolved,
    solvedHard: competitorProfileData.hardSolved,
    submissionCalendar: competitorProfileData.submissionCalendar, // Include submission calendar for future use
    contestAttend: competitorContestData.contestAttend,
    contestRating: competitorContestData.contestRating,
    contestGlobalRanking: competitorContestData.contestGlobalRanking,
    contestTopPercentage: competitorContestData.contestTopPercentage,
  };

  return { myProfile, competitorProfile };
}

function calculateAcceptanceRate(submissions) {
  const total = submissions.find((sub) => sub.difficulty === "All").submissions;
  const accepted = submissions.find((sub) => sub.difficulty === "All").count;

  return ((accepted / total) * 100).toFixed(2);
}

function calculateAverageSubmissions(submissionCalendar) {
  const timestamps = Object.keys(submissionCalendar).map(Number); // Convert keys to numbers (timestamps)
  const dates = timestamps.map((ts) => new Date(ts * 1000)); // Convert timestamps to Date objects

  // Sort dates in ascending order
  dates.sort((a, b) => a - b);

  // Calculate date difference between first and last date in milliseconds
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const dateDifferenceMs = lastDate - firstDate;

  // Convert milliseconds to days
  const daysDifference = Math.ceil(dateDifferenceMs / (1000 * 60 * 60 * 24));

  // Filter dates within the last x days
  const currentDate = new Date();
  const startDate = new Date(
    currentDate.getTime() - daysDifference * 24 * 60 * 60 * 1000
  );
  const filteredDates = dates.filter(
    (date) => date >= startDate && date <= currentDate
  );

  // Calculate total submissions and average submissions per day
  let totalSubmissions = 0;
  filteredDates.forEach((date) => {
    const timestamp = Math.floor(date.getTime() / 1000); // Convert date to Unix timestamp
    totalSubmissions += submissionCalendar[timestamp.toString()] || 0; // Accumulate submissions
  });

  const averageSubmissionsPerDay = totalSubmissions / daysDifference;

  return { averageSubmissions: averageSubmissionsPerDay, daysDifference };
}

function generateComparisonHtml(
  comparisonResult,
  myAverageSubmissions,
  competitorAverageSubmissions
) {
  const { myProfile, competitorProfile } = comparisonResult;

  // Function to determine if a difference is good (positive) or bad (negative)
  const determineColor = (difference) => {
    if (difference > 0) {
      return "green"; // Good (positive difference)
    } else if (difference < 0) {
      return "red"; // Bad (negative difference)
    } else {
      return ""; // No difference
    }
  };

  // Function to format the difference with color
  const formatDifference = (difference) => {
    const color = determineColor(difference);
    const absDifference = Math.abs(difference);
    if (absDifference % 1 === 0) {
      return `<span style="color: ${color}; font-weight:bold;">${absDifference}</span>`;
    } else {
      return `<span style="color: ${color}; font-weight:bold;">${absDifference.toFixed(
        2
      )}</span>`;
    }
  };

  // Safely handle undefined or null values for formatting
  const safeToFixed = (value, decimals = 2) => {
    return value !== undefined && value !== null
      ? value.toFixed(decimals)
      : "N/A";
  };

  const interpretation = () => {
    let interpretationText = "You are good in all aspects.";

    // Check differences in easy, medium, and hard problems solved
    let lessSolvedCategories = [];
    if (myProfile.solvedEasy < competitorProfile.solvedEasy) {
      lessSolvedCategories.push("easy");
    }
    if (myProfile.solvedMedium < competitorProfile.solvedMedium) {
      lessSolvedCategories.push("medium");
    }
    if (myProfile.solvedHard < competitorProfile.solvedHard) {
      lessSolvedCategories.push("hard");
    }
    let flag = 0;
    if (myProfile.contestAttend < competitorProfile.contestAttend) {
      flag = 1;
      interpretationText = "Give more contests.";
      if (lessSolvedCategories.length !== 0) {
        interpretationText = interpretationText.substring(
          0,
          interpretationText.length - 1
        );
        interpretationText += " and f";
      }
    }
    // Constructing the interpretation text

    if (lessSolvedCategories.length !== 0 && flag == 0) {
      interpretationText = "F";
    }
    if (lessSolvedCategories.length === 3) {
      interpretationText += `ocus more on ${lessSolvedCategories[0]}, ${lessSolvedCategories[1]}, and ${lessSolvedCategories[2]} problems.`;
    } else if (lessSolvedCategories.length === 2) {
      interpretationText += `ocus more on ${lessSolvedCategories[0]} and ${lessSolvedCategories[1]} problems.`;
    } else if (lessSolvedCategories.length === 1) {
      interpretationText += `ocus more on ${lessSolvedCategories[0]} problems.`;
    }

    return interpretationText;
  };
  const topPercentDifference =
    competitorProfile.contestTopPercentage - myProfile.contestTopPercentage;
  const topPercentDifferenceColor = topPercentDifference < 0 ? "red" : "green";
  const contestComparisonHtml = `
    <tr>
      <td>Contest Attendance</td>
      <td>${myProfile.contestAttend}</td>
      <td>${competitorProfile.contestAttend}</td>
      <td>${formatDifference(
        myProfile.contestAttend - competitorProfile.contestAttend
      )}</td>
    </tr>
    <tr>
      <td>Contest Rating</td>
      <td>${safeToFixed(myProfile.contestRating)}</td>
      <td>${safeToFixed(competitorProfile.contestRating)}</td>
      <td>${formatDifference(
        myProfile.contestRating - competitorProfile.contestRating
      )}</td>
    </tr>
    <tr>
      <td>Contest Global Ranking</td>
      <td>${myProfile.contestGlobalRanking}</td>
      <td>${competitorProfile.contestGlobalRanking}</td>
      <td>${formatDifference(
        competitorProfile.contestGlobalRanking - myProfile.contestGlobalRanking
      )}</td>
    </tr>
    <tr>
      <td>Top Percentage</td>
      <td>${safeToFixed(myProfile.contestTopPercentage, 2)}%</td>
      <td>${safeToFixed(competitorProfile.contestTopPercentage, 2)}%</td>
      <td style="color:${topPercentDifferenceColor}">${formatDifference(
    topPercentDifference
  )}%</td>
    </tr>
  `;

  const statement = `<div style="font-size:larger;font-weight: bold; margin-top: 20px;">${interpretation()}</div>`;

  return `
      <h2>Comparison Result</h2>
      <table>
        <tr>
          <th>Category</th>
          <th>Your Profile</th>
          <th>Competitor's Profile</th>
          <th>Difference</th>
        </tr>
        <tr>
          <td>Rank</td>
          <td>${myProfile.rank}</td>
          <td>${competitorProfile.rank}</td>
          <td>${formatDifference(competitorProfile.rank - myProfile.rank)}</td>
        </tr>
        <tr>
          <td>Total Problems Solved</td>
          <td>${myProfile.totalSolved}</td>
          <td>${competitorProfile.totalSolved}</td>
          <td>${formatDifference(
            myProfile.totalSolved - competitorProfile.totalSolved
          )}</td>
        </tr>
        <tr>
          <td>Acceptance Rate (%)</td>
          <td>${myProfile.acceptanceRate}</td>
          <td>${competitorProfile.acceptanceRate}</td>
          <td>${formatDifference(
            myProfile.acceptanceRate - competitorProfile.acceptanceRate
          )}</td>
        </tr>
        <tr>
          <td>Easy Problems Solved</td>
          <td>${myProfile.solvedEasy}</td>
          <td>${competitorProfile.solvedEasy}</td>
          <td>${formatDifference(
            myProfile.solvedEasy - competitorProfile.solvedEasy
          )}</td>
        </tr>
        <tr>
          <td>Medium Problems Solved</td>
          <td>${myProfile.solvedMedium}</td>
          <td>${competitorProfile.solvedMedium}</td>
          <td>${formatDifference(
            myProfile.solvedMedium - competitorProfile.solvedMedium
          )}</td>
        </tr>
        <tr>
          <td>Hard Problems Solved</td>
          <td>${myProfile.solvedHard}</td>
          <td>${competitorProfile.solvedHard}</td>
          <td>${formatDifference(
            myProfile.solvedHard - competitorProfile.solvedHard
          )}</td>
        </tr>
        <tr>
          <td>Average Submissions in Last ${
            myAverageSubmissions.daysDifference
          } Days</td>
          <td>${myAverageSubmissions.averageSubmissions.toFixed(2)}</td>
          <td>${competitorAverageSubmissions.averageSubmissions.toFixed(2)}</td>
          <td>${formatDifference(
            myAverageSubmissions.averageSubmissions -
              competitorAverageSubmissions.averageSubmissions
          )}</td>
        </tr>
        ${contestComparisonHtml}
      </table>
        ${statement}
    `;
}
