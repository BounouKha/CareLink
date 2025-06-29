import React from 'react';

const TicketStats = ({ stats }) => {
    const statCards = [
        {
            title: 'Total Tickets',
            value: stats.total_tickets || 0,
            icon: 'fas fa-ticket-alt',
            color: 'primary',
            bgColor: 'bg-primary'
        },
        {
            title: 'New Tickets',
            value: stats.new_tickets || 0,
            icon: 'fas fa-plus-circle',
            color: 'info',
            bgColor: 'bg-info'
        },
        {
            title: 'In Progress',
            value: stats.in_progress || 0,
            icon: 'fas fa-clock',
            color: 'warning',
            bgColor: 'bg-warning'
        },
        {
            title: 'Resolved',
            value: stats.resolved || 0,
            icon: 'fas fa-check-circle',
            color: 'success',
            bgColor: 'bg-success'
        },
        {
            title: 'My Tickets',
            value: stats.my_tickets || 0,
            icon: 'fas fa-user',
            color: 'secondary',
            bgColor: 'bg-secondary'
        },
        {
            title: 'Assigned to Me',
            value: stats.assigned_to_me || 0,
            icon: 'fas fa-user-check',
            color: 'dark',
            bgColor: 'bg-dark'
        }
    ];

    return (
        <div className="ticket-stats">
            <div className="row g-2">
                {statCards.map((stat, index) => (
                    <div key={index} className="col-6 col-md-4 col-lg-2">
                        <div className={`card text-white ${stat.bgColor} h-100`}>
                            <div className="card-body p-2">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="card-title mb-1 small">{stat.title}</h6>
                                        <h4 className="mb-0 fw-bold">{stat.value}</h4>
                                    </div>
                                    <div className="stat-icon">
                                        <i className={`${stat.icon} fa-lg opacity-75`}></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TicketStats; 