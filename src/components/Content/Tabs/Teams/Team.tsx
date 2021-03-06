import React from 'react';
import { Button } from 'reactstrap';
import * as I from './../../../../api/interfaces';
import { countries } from './../../../../api/countries';
import config from './../../../../api/config';

interface Props {
	team: I.Team;
	edit: () => void;
	hash: string;
}

const TeamListEntry = ({ team, edit, hash }: Props) => {
	const country = !team.country ? null : countries[team.country] || null;

	return (
		<div className="player-list-entry">
			<div className="picture">{team.logo ? <img src={`${team.logo}?hash=${hash}`} /> : null}</div>
			<div className="name">{team.name}</div>
			<div className="shortname">{team.shortName}</div>
			<div className="country">
				{country ? (
					<img
						src={`${config.isDev ? config.apiAddress : '/'}files/img/flags/${country.replace(
							/ /g,
							'-'
						)}.png`}
					/>
				) : null}
			</div>
			<div className="options">
				<Button className="purple-btn round-btn" onClick={edit}>
					Edit
				</Button>
			</div>
		</div>
	);
};

export default TeamListEntry;
